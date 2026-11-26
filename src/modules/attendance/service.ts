import type {
	AttendanceStatus,
	Prisma,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	calculateAttendanceRate,
	countWorkingDaysInMonth,
	formatUtcMidnightToLocalStr,
	getMonthDateBounds,
	getSchoolTodayStr,
	isWithinTeacherEditWindow,
	normalizeSchoolDate,
	parseLocalDateToUtcMidnight,
} from "../../utils/attendanceDate.js";
import { resolveScopedStudentIds } from "../../utils/ownershipScope.js";
import {
	type AttendanceChangeForAlert,
	assertDateEditableByActor,
	assertTeacherCanAccessEnrollments,
	assertWorkingDay,
	attendanceInclude,
	buildTeacherEnrollmentScopeWhere,
	checkWorkingDayStatus,
	dispatchAttendanceChangeAlerts,
	getSchoolWeeklyOffDays,
	getTeacherAssignedPairs,
} from "./helpers.js";
import type {
	AttendanceFilterQuery,
	AuthActor,
	BulkAttendanceInput,
	CreateAttendanceInput,
	DayAttendanceQuery,
	StudentCalendarQuery,
	UpdateAttendanceInput,
} from "./interface.js";

const normalizeRemarks = (value: string | null | undefined): string | null => {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export const createAttendance = async (
	schoolId: number,
	actor: AuthActor,
	payload: CreateAttendanceInput,
) => {
	const { dateStr, utcMidnight } = normalizeSchoolDate(payload.date);
	assertDateEditableByActor(actor, dateStr);
	await assertWorkingDay(schoolId, dateStr);

	const remarks = normalizeRemarks(payload.remarks);
	if (payload.status === "EXCUSED" && !remarks) {
		throw new AppError(400, "Remarks are required when marking EXCUSED");
	}

	const enrollment = await prisma.enrollment.findFirst({
		where: {
			id: payload.enrollmentId,
			schoolId,
			studentId: payload.studentId,
		},
		select: { id: true, classId: true, sectionId: true },
	});

	if (!enrollment) {
		throw new AppError(
			404,
			"Enrollment not found for this student in this school",
		);
	}

	await assertTeacherCanAccessEnrollments(schoolId, actor, [enrollment]);

	const existing = await prisma.attendance.findUnique({
		where: {
			studentId_date: {
				studentId: payload.studentId,
				date: utcMidnight,
			},
		},
		include: attendanceInclude,
	});

	if (existing && existing.schoolId !== schoolId) {
		throw new AppError(403, "Attendance record belongs to another school");
	}

	const unchanged =
		existing !== null &&
		existing.status === payload.status &&
		normalizeRemarks(existing.remarks) === remarks;

	if (unchanged && existing) {
		return { record: existing, changed: false, notifiedCount: 0 };
	}

	const record = await prisma.$transaction(async (tx) => {
		const saved = existing
			? await tx.attendance.update({
					where: { id: existing.id },
					data: {
						status: payload.status,
						remarks,
						markedBy: actor.userId,
					},
					include: attendanceInclude,
				})
			: await tx.attendance.create({
					data: {
						schoolId,
						studentId: payload.studentId,
						enrollmentId: payload.enrollmentId,
						date: utcMidnight,
						status: payload.status,
						remarks,
						markedBy: actor.userId,
					},
					include: attendanceInclude,
				});

		await tx.attendanceHistory.create({
			data: {
				attendanceId: saved.id,
				schoolId,
				oldStatus: existing?.status ?? null,
				newStatus: saved.status,
				oldRemarks: existing?.remarks ?? null,
				newRemarks: saved.remarks ?? null,
				changedBy: actor.userId,
			},
		});

		return saved;
	});

	let notifiedCount = 0;
	try {
		notifiedCount = await dispatchAttendanceChangeAlerts(
			schoolId,
			actor.userId,
			[
				{
					id: record.id,
					studentId: record.studentId,
					date: record.date,
					oldStatus: existing?.status ?? null,
					oldRemarks: existing?.remarks ?? null,
					newStatus: record.status,
					newRemarks: record.remarks,
					student: record.student,
					enrollment: record.enrollment,
				},
			],
		);
	} catch (err) {
		console.error("Failed to dispatch attendance alert:", err);
	}

	return { record, changed: true, notifiedCount };
};

export const bulkMarkAttendance = async (
	schoolId: number,
	actor: AuthActor,
	payload: BulkAttendanceInput,
) => {
	const { dateStr, utcMidnight } = normalizeSchoolDate(payload.date);
	assertDateEditableByActor(actor, dateStr);
	await assertWorkingDay(schoolId, dateStr);

	// Deduplicate by studentId (last entry wins)
	const dedupedByStudent = new Map<
		number,
		BulkAttendanceInput["records"][number]
	>();
	for (const rec of payload.records) {
		const rem = normalizeRemarks(rec.remarks);
		if (rec.status === "EXCUSED" && !rem) {
			throw new AppError(
				400,
				`Remarks are required for EXCUSED status (student #${rec.studentId})`,
			);
		}
		dedupedByStudent.set(rec.studentId, rec);
	}

	const recordsInput = Array.from(dedupedByStudent.values());
	const enrollmentIds = recordsInput.map((r) => r.enrollmentId);
	const studentIds = recordsInput.map((r) => r.studentId);

	const enrollments = await prisma.enrollment.findMany({
		where: { id: { in: enrollmentIds }, schoolId },
		select: { id: true, studentId: true, classId: true, sectionId: true },
	});

	const enrollmentMap = new Map(enrollments.map((e) => [e.id, e]));
	for (const rec of recordsInput) {
		const matched = enrollmentMap.get(rec.enrollmentId);
		if (!matched || matched.studentId !== rec.studentId) {
			throw new AppError(
				404,
				`Enrollment ${rec.enrollmentId} does not match student ${rec.studentId} in this school`,
			);
		}
	}

	await assertTeacherCanAccessEnrollments(schoolId, actor, enrollments);

	const existingRecords = await prisma.attendance.findMany({
		where: {
			schoolId,
			date: utcMidnight,
			studentId: { in: studentIds },
		},
		include: attendanceInclude,
	});
	const existingByStudent = new Map(
		existingRecords.map((r) => [r.studentId, r]),
	);

	// Compute real diffs — write only new or changed rows
	const toWrite = recordsInput.filter((rec) => {
		const prev = existingByStudent.get(rec.studentId);
		if (!prev) return true;
		return (
			prev.status !== rec.status ||
			normalizeRemarks(prev.remarks) !== normalizeRemarks(rec.remarks)
		);
	});

	if (toWrite.length === 0) {
		return {
			records: existingRecords,
			changedCount: 0,
			notifiedCount: 0,
		};
	}

	const savedChanged = await prisma.$transaction(async (tx) => {
		const results = [];
		for (const rec of toWrite) {
			const prev = existingByStudent.get(rec.studentId);
			const nextRemarks = normalizeRemarks(rec.remarks);

			const saved = prev
				? await tx.attendance.update({
						where: { id: prev.id },
						data: {
							status: rec.status,
							remarks: nextRemarks,
							markedBy: actor.userId,
						},
						include: attendanceInclude,
					})
				: await tx.attendance.create({
						data: {
							schoolId,
							studentId: rec.studentId,
							enrollmentId: rec.enrollmentId,
							date: utcMidnight,
							status: rec.status,
							remarks: nextRemarks,
							markedBy: actor.userId,
						},
						include: attendanceInclude,
					});

			await tx.attendanceHistory.create({
				data: {
					attendanceId: saved.id,
					schoolId,
					oldStatus: prev?.status ?? null,
					newStatus: saved.status,
					oldRemarks: prev?.remarks ?? null,
					newRemarks: saved.remarks ?? null,
					changedBy: actor.userId,
				},
			});

			results.push({
				saved,
				oldStatus: prev?.status ?? null,
				oldRemarks: prev?.remarks ?? null,
			});
		}
		return results;
	});

	const changesForAlerts: AttendanceChangeForAlert[] = savedChanged.map(
		({ saved, oldStatus, oldRemarks }) => ({
			id: saved.id,
			studentId: saved.studentId,
			date: saved.date,
			oldStatus,
			oldRemarks,
			newStatus: saved.status,
			newRemarks: saved.remarks,
			student: saved.student,
			enrollment: saved.enrollment,
		}),
	);

	let notifiedCount = 0;
	try {
		notifiedCount = await dispatchAttendanceChangeAlerts(
			schoolId,
			actor.userId,
			changesForAlerts,
		);
	} catch (err) {
		console.error("Failed to dispatch bulk attendance alerts:", err);
	}

	// Merge unchanged + updated records in input order
	const savedByStudent = new Map(
		savedChanged.map(({ saved }) => [saved.studentId, saved]),
	);
	const mergedRecords = recordsInput
		.map(
			(r) =>
				savedByStudent.get(r.studentId) ?? existingByStudent.get(r.studentId),
		)
		.filter((r): r is NonNullable<typeof r> => r !== undefined);

	return {
		records: mergedRecords,
		changedCount: savedChanged.length,
		notifiedCount,
	};
};

export const getAttendances = async (
	schoolId: number,
	actor: AuthActor,
	query: AttendanceFilterQuery,
) => {
	const page = Math.max(1, query.page ?? 1);
	const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));

	const andConditions: Prisma.AttendanceWhereInput[] = [{ schoolId }];

	// Push role scoping directly into Prisma WHERE clause (zero in-memory filtering)
	if (actor.role === "GUARDIAN" || actor.role === "STUDENT") {
		const scopedIds = await resolveScopedStudentIds(schoolId, actor);
		const allowedIds = scopedIds ?? [];
		if (allowedIds.length === 0) {
			return {
				records: [],
				meta: { page, pageSize, total: 0, totalPages: 0 },
			};
		}
		if (
			query.studentId !== undefined &&
			!allowedIds.includes(query.studentId)
		) {
			return {
				records: [],
				meta: { page, pageSize, total: 0, totalPages: 0 },
			};
		}
		andConditions.push({
			studentId:
				query.studentId !== undefined ? query.studentId : { in: allowedIds },
		});
	} else if (actor.role === "TEACHER") {
		const pairs = await getTeacherAssignedPairs(schoolId, actor);
		if (pairs.length === 0) {
			return {
				records: [],
				meta: { page, pageSize, total: 0, totalPages: 0 },
			};
		}
		andConditions.push({
			enrollment: buildTeacherEnrollmentScopeWhere(pairs),
		});
		if (query.studentId !== undefined) {
			andConditions.push({ studentId: query.studentId });
		}
	} else if (query.studentId !== undefined) {
		andConditions.push({ studentId: query.studentId });
	}

	if (query.enrollmentId !== undefined) {
		andConditions.push({ enrollmentId: query.enrollmentId });
	}
	if (query.status !== undefined) {
		andConditions.push({ status: query.status });
	}
	if (query.classId !== undefined || query.sectionId !== undefined) {
		andConditions.push({
			enrollment: {
				...(query.classId !== undefined ? { classId: query.classId } : {}),
				...(query.sectionId !== undefined
					? { sectionId: query.sectionId }
					: {}),
			},
		});
	}
	if (query.fromDate || query.toDate) {
		const dateRange: Prisma.DateTimeFilter = {};
		if (query.fromDate) {
			dateRange.gte = parseLocalDateToUtcMidnight(query.fromDate);
		}
		if (query.toDate) {
			const end = parseLocalDateToUtcMidnight(query.toDate);
			end.setUTCHours(23, 59, 59, 999);
			dateRange.lte = end;
		}
		andConditions.push({ date: dateRange });
	}
	if (query.search?.trim()) {
		const term = query.search.trim();
		andConditions.push({
			student: {
				OR: [
					{ firstName: { contains: term, mode: "insensitive" } },
					{ lastName: { contains: term, mode: "insensitive" } },
					{ nameBangla: { contains: term, mode: "insensitive" } },
					{ studentId: { contains: term, mode: "insensitive" } },
				],
			},
		});
	}

	const where: Prisma.AttendanceWhereInput = { AND: andConditions };

	const [total, records] = await Promise.all([
		prisma.attendance.count({ where }),
		prisma.attendance.findMany({
			where,
			include: attendanceInclude,
			orderBy: [{ date: "desc" }, { id: "desc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
	]);

	return {
		records,
		meta: {
			page,
			pageSize,
			total,
			totalPages: Math.ceil(total / pageSize),
		},
	};
};

export const getDayAttendance = async (
	schoolId: number,
	actor: AuthActor,
	query: DayAttendanceQuery,
) => {
	const { dateStr, utcMidnight } = normalizeSchoolDate(query.date);

	const enrollmentAnd: Prisma.EnrollmentWhereInput[] = [
		{ schoolId, status: "ACTIVE" },
	];

	if (query.classId !== undefined) {
		enrollmentAnd.push({ classId: query.classId });
	}
	if (query.sectionId !== undefined) {
		enrollmentAnd.push({ sectionId: query.sectionId });
	}

	if (actor.role === "TEACHER") {
		const pairs = await getTeacherAssignedPairs(schoolId, actor);
		if (pairs.length === 0) {
			const working = await checkWorkingDayStatus(schoolId, dateStr);
			return {
				date: dateStr,
				...working,
				canEditDate: isWithinTeacherEditWindow(dateStr),
				alreadyMarked: false,
				rows: [],
			};
		}
		enrollmentAnd.push(buildTeacherEnrollmentScopeWhere(pairs));
	}

	const [working, enrollments] = await Promise.all([
		checkWorkingDayStatus(schoolId, dateStr),
		prisma.enrollment.findMany({
			where: { AND: enrollmentAnd },
			select: {
				id: true,
				studentId: true,
				classId: true,
				sectionId: true,
				rollNumber: true,
				student: {
					select: {
						id: true,
						studentId: true,
						firstName: true,
						lastName: true,
						nameBangla: true,
					},
				},
				class: { select: { id: true, name: true } },
				section: { select: { id: true, name: true } },
			},
			orderBy: [
				{ classId: "asc" },
				{ sectionId: "asc" },
				{ rollNumber: "asc" },
				{ studentId: "asc" },
			],
		}),
	]);

	const studentIds = enrollments.map((e) => e.studentId);

	const [existingAttendances, approvedLeaves] =
		studentIds.length > 0
			? await Promise.all([
					prisma.attendance.findMany({
						where: {
							schoolId,
							date: utcMidnight,
							studentId: { in: studentIds },
						},
						select: {
							id: true,
							studentId: true,
							status: true,
							remarks: true,
							markedBy: true,
							updatedAt: true,
							markedByUser: { select: { id: true, name: true } },
						},
					}),
					prisma.leaveRequest.findMany({
						where: {
							schoolId,
							studentId: { in: studentIds },
							status: "APPROVED",
							fromDate: { lte: utcMidnight },
							toDate: { gte: utcMidnight },
						},
						select: {
							id: true,
							studentId: true,
							reason: true,
							fromDate: true,
							toDate: true,
						},
					}),
				])
			: [[], []];

	const attByStudent = new Map(
		existingAttendances.map((a) => [a.studentId, a]),
	);
	const leaveByStudent = new Map(approvedLeaves.map((l) => [l.studentId, l]));

	const rows = enrollments.map((en) => {
		const existing = attByStudent.get(en.studentId) ?? null;
		const approvedLeave = leaveByStudent.get(en.studentId) ?? null;
		const suggestedStatus: AttendanceStatus | null =
			!existing && approvedLeave ? "EXCUSED" : null;
		const suggestedRemarks: string | null =
			!existing && approvedLeave
				? `Approved leave: ${approvedLeave.reason}`
				: null;

		return {
			enrollmentId: en.id,
			studentId: en.studentId,
			rollNumber: en.rollNumber,
			student: en.student,
			class: en.class,
			section: en.section,
			existing: existing
				? {
						id: existing.id,
						status: existing.status,
						remarks: existing.remarks,
						markedBy: existing.markedByUser,
						updatedAt: existing.updatedAt,
					}
				: null,
			approvedLeave: approvedLeave
				? {
						id: approvedLeave.id,
						reason: approvedLeave.reason,
						fromDate: formatUtcMidnightToLocalStr(approvedLeave.fromDate),
						toDate: formatUtcMidnightToLocalStr(approvedLeave.toDate),
					}
				: null,
			suggestedStatus,
			suggestedRemarks,
		};
	});

	const canEditDate =
		actor.role !== "TEACHER" || isWithinTeacherEditWindow(dateStr);

	return {
		date: dateStr,
		...working,
		canEditDate,
		alreadyMarked: existingAttendances.length > 0,
		rows,
	};
};

export const getAttendanceById = async (
	schoolId: number,
	id: number,
	actor: AuthActor,
) => {
	const attendance = await prisma.attendance.findFirst({
		where: { id, schoolId },
		include: attendanceInclude,
	});

	if (!attendance) {
		throw new AppError(404, "Attendance record not found");
	}

	if (actor.role === "GUARDIAN" || actor.role === "STUDENT") {
		const allowedIds = await resolveScopedStudentIds(schoolId, actor);
		if (allowedIds !== null && !allowedIds.includes(attendance.studentId)) {
			throw new AppError(
				403,
				"You do not have permission to view this attendance record",
			);
		}
	} else if (actor.role === "TEACHER") {
		await assertTeacherCanAccessEnrollments(schoolId, actor, [
			{
				classId: attendance.enrollment.class.id,
				sectionId: attendance.enrollment.section?.id ?? null,
			},
		]);
	}

	return attendance;
};

export const updateAttendance = async (
	schoolId: number,
	id: number,
	actor: AuthActor,
	payload: UpdateAttendanceInput,
) => {
	const existing = await prisma.attendance.findFirst({
		where: { id, schoolId },
		include: {
			enrollment: { select: { classId: true, sectionId: true } },
		},
	});

	if (!existing) {
		throw new AppError(404, "Attendance record not found");
	}

	const dateStr = formatUtcMidnightToLocalStr(existing.date);
	assertDateEditableByActor(actor, dateStr);
	await assertTeacherCanAccessEnrollments(schoolId, actor, [
		existing.enrollment,
	]);

	const nextStatus = payload.status ?? existing.status;
	const nextRemarks =
		payload.remarks !== undefined
			? normalizeRemarks(payload.remarks)
			: normalizeRemarks(existing.remarks);

	if (nextStatus === "EXCUSED" && !nextRemarks) {
		throw new AppError(400, "Remarks are required when marking EXCUSED");
	}

	const unchanged =
		existing.status === nextStatus &&
		normalizeRemarks(existing.remarks) === nextRemarks;

	if (unchanged) {
		const current = await prisma.attendance.findUniqueOrThrow({
			where: { id },
			include: attendanceInclude,
		});
		return { record: current, changed: false, notifiedCount: 0 };
	}

	const updated = await prisma.$transaction(async (tx) => {
		const saved = await tx.attendance.update({
			where: { id },
			data: {
				markedBy: actor.userId,
				status: nextStatus,
				remarks: nextRemarks,
			},
			include: attendanceInclude,
		});

		await tx.attendanceHistory.create({
			data: {
				attendanceId: saved.id,
				schoolId,
				oldStatus: existing.status,
				newStatus: saved.status,
				oldRemarks: existing.remarks,
				newRemarks: saved.remarks,
				changedBy: actor.userId,
			},
		});

		return saved;
	});

	let notifiedCount = 0;
	try {
		notifiedCount = await dispatchAttendanceChangeAlerts(
			schoolId,
			actor.userId,
			[
				{
					id: updated.id,
					studentId: updated.studentId,
					date: updated.date,
					oldStatus: existing.status,
					oldRemarks: existing.remarks,
					newStatus: updated.status,
					newRemarks: updated.remarks,
					student: updated.student,
					enrollment: updated.enrollment,
				},
			],
		);
	} catch (err) {
		console.error("Failed to dispatch attendance update alert:", err);
	}

	return { record: updated, changed: true, notifiedCount };
};

export const deleteAttendance = async (schoolId: number, id: number) => {
	const existing = await prisma.attendance.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Attendance record not found");
	}

	return prisma.attendance.delete({ where: { id } });
};

export const getAttendanceHistory = async (
	schoolId: number,
	attendanceId: number,
	actor: AuthActor,
) => {
	// Reuse permission check from getAttendanceById
	await getAttendanceById(schoolId, attendanceId, actor);

	return prisma.attendanceHistory.findMany({
		where: { schoolId, attendanceId },
		include: {
			changedByUser: { select: { id: true, name: true, role: true } },
		},
		orderBy: { changedAt: "desc" },
	});
};

export const getMyLinkedStudents = async (
	schoolId: number,
	actor: AuthActor,
) => {
	const scopedIds = await resolveScopedStudentIds(schoolId, actor);
	if (scopedIds === null) {
		return [];
	}
	if (scopedIds.length === 0) {
		return [];
	}

	const students = await prisma.student.findMany({
		where: { schoolId, id: { in: scopedIds }, isActive: true },
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			nameBangla: true,
			enrollments: {
				where: { status: "ACTIVE", schoolId },
				take: 1,
				select: {
					id: true,
					rollNumber: true,
					class: { select: { id: true, name: true } },
					section: { select: { id: true, name: true } },
				},
			},
		},
		orderBy: { firstName: "asc" },
	});

	return students.map((s) => ({
		id: s.id,
		studentId: s.studentId,
		firstName: s.firstName,
		lastName: s.lastName,
		nameBangla: s.nameBangla,
		activeEnrollment: s.enrollments[0] ?? null,
	}));
};

export const getStudentCalendar = async (
	schoolId: number,
	actor: AuthActor,
	query: StudentCalendarQuery,
) => {
	let targetStudentId = query.studentId;

	if (actor.role === "GUARDIAN" || actor.role === "STUDENT") {
		const allowedIds = (await resolveScopedStudentIds(schoolId, actor)) ?? [];
		if (allowedIds.length === 0) {
			throw new AppError(404, "No linked student found");
		}
		if (targetStudentId !== undefined) {
			if (!allowedIds.includes(targetStudentId)) {
				throw new AppError(
					403,
					"You do not have permission to view this student's attendance",
				);
			}
		} else {
			targetStudentId = allowedIds[0];
		}
	} else {
		if (!targetStudentId) {
			throw new AppError(400, "studentId is required");
		}
		const student = await prisma.student.findFirst({
			where: { id: targetStudentId, schoolId },
			select: { id: true },
		});
		if (!student) {
			throw new AppError(404, "Student not found in this school");
		}
		if (actor.role === "TEACHER") {
			const activeEn = await prisma.enrollment.findFirst({
				where: { schoolId, studentId: targetStudentId, status: "ACTIVE" },
				select: { classId: true, sectionId: true },
			});
			if (!activeEn) {
				throw new AppError(403, "Student is not in your assigned classes");
			}
			await assertTeacherCanAccessEnrollments(schoolId, actor, [activeEn]);
		}
	}

	if (!targetStudentId) {
		throw new AppError(400, "studentId is required");
	}
	const resolvedStudentId: number = targetStudentId;

	const bounds = getMonthDateBounds(query.month);
	const prevBounds = getMonthDateBounds(bounds.prevMonth);
	const todayStr = getSchoolTodayStr();

	const [weeklyOffDays, holidays, monthRecords, prevRecords] =
		await Promise.all([
			getSchoolWeeklyOffDays(schoolId),
			prisma.schoolHoliday.findMany({
				where: {
					schoolId,
					date: { gte: prevBounds.fromDate, lte: bounds.toDate },
				},
				select: { date: true, title: true },
			}),
			prisma.attendance.findMany({
				where: {
					schoolId,
					studentId: resolvedStudentId,
					date: { gte: bounds.fromDate, lte: bounds.toDate },
				},
				select: {
					id: true,
					date: true,
					status: true,
					remarks: true,
				},
				orderBy: { date: "asc" },
			}),
			prisma.attendance.findMany({
				where: {
					schoolId,
					studentId: resolvedStudentId,
					date: { gte: prevBounds.fromDate, lte: prevBounds.toDate },
				},
				select: { status: true },
			}),
		]);

	const holidayMap = new Map<string, string>();
	for (const h of holidays) {
		holidayMap.set(formatUtcMidnightToLocalStr(h.date), h.title);
	}

	const currentMonthHolidaySet = new Set<string>();
	const prevMonthHolidaySet = new Set<string>();
	for (const [dStr] of holidayMap.entries()) {
		if (dStr.startsWith(query.month)) currentMonthHolidaySet.add(dStr);
		if (dStr.startsWith(bounds.prevMonth)) prevMonthHolidaySet.add(dStr);
	}

	const { workingDays, weeklyOffDateStrs } = countWorkingDaysInMonth(
		query.month,
		weeklyOffDays,
		currentMonthHolidaySet,
		todayStr,
	);

	const { workingDays: prevWorkingDays } = countWorkingDaysInMonth(
		bounds.prevMonth,
		weeklyOffDays,
		prevMonthHolidaySet,
		todayStr,
	);

	const recordByDate = new Map(
		monthRecords.map((r) => [formatUtcMidnightToLocalStr(r.date), r]),
	);

	let present = 0;
	let absent = 0;
	let late = 0;
	let excused = 0;
	for (const r of monthRecords) {
		if (r.status === "PRESENT") present++;
		else if (r.status === "ABSENT") absent++;
		else if (r.status === "LATE") late++;
		else if (r.status === "EXCUSED") excused++;
	}

	let prevPresent = 0;
	let prevLate = 0;
	let prevExcused = 0;
	for (const r of prevRecords) {
		if (r.status === "PRESENT") prevPresent++;
		else if (r.status === "LATE") prevLate++;
		else if (r.status === "EXCUSED") prevExcused++;
	}

	const rate = calculateAttendanceRate(present, late, excused, workingDays);
	const prevRate = calculateAttendanceRate(
		prevPresent,
		prevLate,
		prevExcused,
		prevWorkingDays,
	);

	const offSet = new Set(weeklyOffDateStrs);
	const days = [];
	for (let d = 1; d <= bounds.totalDays; d++) {
		const dateStr = `${bounds.year}-${String(bounds.monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		const rec = recordByDate.get(dateStr) ?? null;
		const holidayTitle = holidayMap.get(dateStr) ?? null;
		days.push({
			date: dateStr,
			status: rec?.status ?? null,
			remarks: rec?.remarks ?? null,
			attendanceId: rec?.id ?? null,
			isWeeklyOff: offSet.has(dateStr),
			isHoliday: holidayTitle !== null,
			holidayTitle,
			isFuture: dateStr > todayStr,
		});
	}

	return {
		studentId: targetStudentId,
		month: query.month,
		today: todayStr,
		weeklyOffDays,
		holidays: Array.from(currentMonthHolidaySet).map((d) => ({
			date: d,
			title: holidayMap.get(d) ?? "",
		})),
		days,
		summary: {
			workingDays,
			present,
			absent,
			late,
			excused,
			rate,
		},
		previousMonth: {
			month: bounds.prevMonth,
			workingDays: prevWorkingDays,
			rate: prevRate,
		},
	};
};
