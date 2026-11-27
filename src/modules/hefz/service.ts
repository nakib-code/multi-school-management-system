import {
	HefzAttendanceStatus,
	HefzEnrollmentStatus,
	type Prisma,
	SobokQuality,
	UserRole,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { resolveScopedTeacherId } from "../../utils/ownershipScope.js";
import type {
	CreateHefzDailyLogInput,
	CreateHefzEnrollmentInput,
	HefzDailyLogFilterQuery,
	HefzEnrollmentFilterQuery,
	HefzProgressQuery,
	UpdateHefzDailyLogInput,
	UpdateHefzEnrollmentInput,
} from "./interface.js";

const normalizeDate = (date: Date): Date => {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
};

const hefzEnrollmentInclude = {
	student: {
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			isActive: true,
		},
	},
	ustad: {
		select: {
			id: true,
			employeeId: true,
			firstName: true,
			lastName: true,
			designation: true,
		},
	},
	_count: {
		select: { dailyLogs: true },
	},
};

const hefzDailyLogInclude = {
	hefzEnrollment: {
		select: {
			id: true,
			wing: true,
			currentPara: true,
			currentSurah: true,
			status: true,
			student: {
				select: { id: true, studentId: true, firstName: true, lastName: true },
			},
			ustad: {
				select: { id: true, employeeId: true, firstName: true, lastName: true },
			},
		},
	},
};

/* ---------- Hefz & Najera Enrollments ---------- */

export const createHefzEnrollment = async (
	schoolId: number,
	payload: CreateHefzEnrollmentInput,
) => {
	const [student, ustad] = await Promise.all([
		prisma.student.findFirst({ where: { id: payload.studentId, schoolId } }),
		prisma.teacher.findFirst({ where: { id: payload.ustadId, schoolId } }),
	]);

	if (!student) throw new AppError(404, "Student not found in this school");
	if (!ustad)
		throw new AppError(404, "Ustad (Teacher) not found in this school");

	const existingActive = await prisma.hefzEnrollment.findFirst({
		where: {
			schoolId,
			studentId: payload.studentId,
			status: HefzEnrollmentStatus.ACTIVE,
		},
	});

	if (existingActive) {
		throw new AppError(
			409,
			"Student already has an active Hefz/Najera enrollment in this school",
		);
	}

	return prisma.hefzEnrollment.create({
		data: {
			schoolId,
			studentId: payload.studentId,
			ustadId: payload.ustadId,
			...(payload.wing !== undefined ? { wing: payload.wing } : {}),
			...(payload.currentPara !== undefined
				? { currentPara: payload.currentPara }
				: {}),
			...(payload.currentSurah !== undefined
				? { currentSurah: payload.currentSurah }
				: {}),
			...(payload.startDate !== undefined
				? { startDate: payload.startDate }
				: {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
		},
		include: hefzEnrollmentInclude,
	});
};

const buildTeacherHefzScopeWhere = async (
	schoolId: number,
	actor?: { userId: number; role: UserRole },
): Promise<{
	teacherId: number;
	where: Prisma.HefzEnrollmentWhereInput;
} | null> => {
	if (actor?.role !== UserRole.TEACHER) return null;

	const teacherId = await resolveScopedTeacherId(schoolId, actor);
	if (!teacherId || teacherId < 0) {
		return { teacherId: -1, where: { id: -1 } };
	}

	const assignments = await prisma.teacherAssignment.findMany({
		where: { schoolId, teacherId, isActive: true },
		select: { classId: true, sectionId: true },
	});

	const orConditions: Prisma.HefzEnrollmentWhereInput[] = [
		{ ustadId: teacherId },
	];

	if (assignments.length > 0) {
		orConditions.push({
			student: {
				enrollments: {
					some: {
						schoolId,
						status: "ACTIVE",
						OR: assignments.map((a) => ({
							classId: a.classId,
							OR: [{ sectionId: a.sectionId }, { sectionId: null }],
						})),
					},
				},
			},
		});
	}

	return { teacherId, where: { OR: orConditions } };
};

export const getHefzEnrollments = async (
	schoolId: number,
	query: HefzEnrollmentFilterQuery,
	actor?: { userId: number; role: UserRole },
) => {
	const teacherScope = await buildTeacherHefzScopeWhere(schoolId, actor);
	if (teacherScope && teacherScope.teacherId < 0) return [];

	const andConditions: Prisma.HefzEnrollmentWhereInput[] = [
		{
			schoolId,
			...(query.studentId !== undefined ? { studentId: query.studentId } : {}),
			...(query.ustadId !== undefined ? { ustadId: query.ustadId } : {}),
			...(query.wing !== undefined ? { wing: query.wing } : {}),
			...(query.status !== undefined ? { status: query.status } : {}),
		},
	];
	if (teacherScope) {
		andConditions.push(teacherScope.where);
	}

	return prisma.hefzEnrollment.findMany({
		where: { AND: andConditions },
		include: hefzEnrollmentInclude,
		orderBy: { createdAt: "desc" },
	});
};

export const getHefzEnrollmentById = async (
	schoolId: number,
	id: number,
	actor?: { userId: number; role: UserRole },
) => {
	const teacherScope = await buildTeacherHefzScopeWhere(schoolId, actor);
	if (teacherScope && teacherScope.teacherId < 0) {
		throw new AppError(403, "Teacher profile not found in this school");
	}

	const enrollment = await prisma.hefzEnrollment.findFirst({
		where: {
			AND: [{ id, schoolId }, ...(teacherScope ? [teacherScope.where] : [])],
		},
		include: {
			...hefzEnrollmentInclude,
			dailyLogs: {
				orderBy: { logDate: "desc" },
				take: 14,
			},
		},
	});

	if (!enrollment) throw new AppError(404, "Hefz enrollment not found");
	return enrollment;
};

export const updateHefzEnrollment = async (
	schoolId: number,
	id: number,
	payload: UpdateHefzEnrollmentInput,
	actor?: { userId: number; role: UserRole },
) => {
	const teacherScope = await buildTeacherHefzScopeWhere(schoolId, actor);
	if (teacherScope && teacherScope.teacherId < 0) {
		throw new AppError(403, "Teacher profile not found in this school");
	}

	const existing = await prisma.hefzEnrollment.findFirst({
		where: {
			AND: [{ id, schoolId }, ...(teacherScope ? [teacherScope.where] : [])],
		},
	});
	if (!existing) {
		throw new AppError(
			teacherScope ? 403 : 404,
			teacherScope
				? "You can only update Hefz enrollments assigned to you"
				: "Hefz enrollment not found",
		);
	}

	if (
		teacherScope &&
		payload.ustadId !== undefined &&
		payload.ustadId !== teacherScope.teacherId
	) {
		throw new AppError(
			403,
			"Teachers cannot reassign a Hefz student to another Ustad",
		);
	}

	if (payload.ustadId !== undefined) {
		const ustad = await prisma.teacher.findFirst({
			where: { id: payload.ustadId, schoolId },
		});
		if (!ustad) {
			throw new AppError(404, "Ustad (Teacher) not found in this school");
		}
	}

	return prisma.hefzEnrollment.update({
		where: { id },
		data: {
			...(payload.ustadId !== undefined ? { ustadId: payload.ustadId } : {}),
			...(payload.wing !== undefined ? { wing: payload.wing } : {}),
			...(payload.currentPara !== undefined
				? { currentPara: payload.currentPara }
				: {}),
			...(payload.currentSurah !== undefined
				? { currentSurah: payload.currentSurah }
				: {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
		},
		include: hefzEnrollmentInclude,
	});
};

export const deleteHefzEnrollment = async (schoolId: number, id: number) => {
	const existing = await prisma.hefzEnrollment.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Hefz enrollment not found");

	return prisma.hefzEnrollment.delete({ where: { id } });
};

/* ---------- Daily Sobok / Sobok-e-Am / Manzil Logs ---------- */

export const upsertHefzDailyLog = async (
	schoolId: number,
	payload: CreateHefzDailyLogInput,
	actor?: { userId: number; role: UserRole },
) => {
	const teacherScope = await buildTeacherHefzScopeWhere(schoolId, actor);
	if (teacherScope && teacherScope.teacherId < 0) {
		throw new AppError(403, "Teacher profile not found in this school");
	}

	const enrollment = await prisma.hefzEnrollment.findFirst({
		where: {
			AND: [
				{ id: payload.hefzEnrollmentId, schoolId },
				...(teacherScope ? [teacherScope.where] : []),
			],
		},
	});
	if (!enrollment) {
		throw new AppError(
			teacherScope ? 403 : 404,
			teacherScope
				? "You can only record Hefz daily logs for your assigned students"
				: "Hefz enrollment not found in this school",
		);
	}

	const normalizedDate = normalizeDate(payload.logDate);

	return prisma.$transaction(async (tx) => {
		const log = await tx.hefzDailyLog.upsert({
			where: {
				hefzEnrollmentId_logDate: {
					hefzEnrollmentId: payload.hefzEnrollmentId,
					logDate: normalizedDate,
				},
			},
			create: {
				hefzEnrollmentId: payload.hefzEnrollmentId,
				schoolId,
				logDate: normalizedDate,
				sobok: payload.sobok,
				...(payload.sobokPagesOrLines !== undefined
					? { sobokPagesOrLines: payload.sobokPagesOrLines }
					: {}),
				...(payload.sobokQuality !== undefined
					? { sobokQuality: payload.sobokQuality }
					: {}),
				...(payload.sobokAm !== undefined ? { sobokAm: payload.sobokAm } : {}),
				...(payload.manzil !== undefined ? { manzil: payload.manzil } : {}),
				...(payload.manzilParas !== undefined
					? { manzilParas: payload.manzilParas }
					: {}),
				...(payload.attendanceStatus !== undefined
					? { attendanceStatus: payload.attendanceStatus }
					: {}),
				...(payload.ustadNote !== undefined
					? { ustadNote: payload.ustadNote }
					: {}),
			},
			update: {
				sobok: payload.sobok,
				...(payload.sobokPagesOrLines !== undefined
					? { sobokPagesOrLines: payload.sobokPagesOrLines }
					: {}),
				...(payload.sobokQuality !== undefined
					? { sobokQuality: payload.sobokQuality }
					: {}),
				...(payload.sobokAm !== undefined ? { sobokAm: payload.sobokAm } : {}),
				...(payload.manzil !== undefined ? { manzil: payload.manzil } : {}),
				...(payload.manzilParas !== undefined
					? { manzilParas: payload.manzilParas }
					: {}),
				...(payload.attendanceStatus !== undefined
					? { attendanceStatus: payload.attendanceStatus }
					: {}),
				...(payload.ustadNote !== undefined
					? { ustadNote: payload.ustadNote }
					: {}),
			},
			include: hefzDailyLogInclude,
		});

		if (
			payload.currentPara !== undefined ||
			payload.currentSurah !== undefined
		) {
			await tx.hefzEnrollment.update({
				where: { id: payload.hefzEnrollmentId },
				data: {
					...(payload.currentPara !== undefined
						? { currentPara: payload.currentPara }
						: {}),
					...(payload.currentSurah !== undefined
						? { currentSurah: payload.currentSurah }
						: {}),
				},
			});
		}

		return log;
	});
};

export const getHefzDailyLogs = async (
	schoolId: number,
	query: HefzDailyLogFilterQuery,
	actor?: { userId: number; role: UserRole },
) => {
	const teacherScope = await buildTeacherHefzScopeWhere(schoolId, actor);
	if (teacherScope && teacherScope.teacherId < 0) return [];

	const logDateFilter: { gte?: Date; lte?: Date } = {};
	if (query.fromDate) logDateFilter.gte = normalizeDate(query.fromDate);
	if (query.toDate) {
		const end = new Date(query.toDate);
		end.setUTCHours(23, 59, 59, 999);
		logDateFilter.lte = end;
	}

	const enrollmentAnd: Prisma.HefzEnrollmentWhereInput[] = [];
	if (query.studentId !== undefined)
		enrollmentAnd.push({ studentId: query.studentId });
	if (query.ustadId !== undefined)
		enrollmentAnd.push({ ustadId: query.ustadId });
	if (query.wing !== undefined) enrollmentAnd.push({ wing: query.wing });
	if (teacherScope) enrollmentAnd.push(teacherScope.where);

	return prisma.hefzDailyLog.findMany({
		where: {
			schoolId,
			...(query.hefzEnrollmentId !== undefined
				? { hefzEnrollmentId: query.hefzEnrollmentId }
				: {}),
			...(query.sobokQuality !== undefined
				? { sobokQuality: query.sobokQuality }
				: {}),
			...(query.attendanceStatus !== undefined
				? { attendanceStatus: query.attendanceStatus }
				: {}),
			...(Object.keys(logDateFilter).length > 0
				? { logDate: logDateFilter }
				: {}),
			...(enrollmentAnd.length > 0
				? { hefzEnrollment: { AND: enrollmentAnd } }
				: {}),
		},
		include: hefzDailyLogInclude,
		orderBy: { logDate: "desc" },
	});
};

export const getHefzDailyLogById = async (
	schoolId: number,
	id: number,
	actor?: { userId: number; role: UserRole },
) => {
	const teacherScope = await buildTeacherHefzScopeWhere(schoolId, actor);
	if (teacherScope && teacherScope.teacherId < 0) {
		throw new AppError(403, "Teacher profile not found in this school");
	}

	const log = await prisma.hefzDailyLog.findFirst({
		where: {
			id,
			schoolId,
			...(teacherScope ? { hefzEnrollment: teacherScope.where } : {}),
		},
		include: hefzDailyLogInclude,
	});
	if (!log) throw new AppError(404, "Hefz daily log not found");
	return log;
};

export const updateHefzDailyLog = async (
	schoolId: number,
	id: number,
	payload: UpdateHefzDailyLogInput,
	actor?: { userId: number; role: UserRole },
) => {
	const teacherScope = await buildTeacherHefzScopeWhere(schoolId, actor);
	if (teacherScope && teacherScope.teacherId < 0) {
		throw new AppError(403, "Teacher profile not found in this school");
	}

	const existing = await prisma.hefzDailyLog.findFirst({
		where: {
			id,
			schoolId,
			...(teacherScope ? { hefzEnrollment: teacherScope.where } : {}),
		},
	});
	if (!existing) {
		throw new AppError(
			teacherScope ? 403 : 404,
			teacherScope
				? "You can only edit Hefz daily logs for your assigned students"
				: "Hefz daily log not found",
		);
	}

	return prisma.hefzDailyLog.update({
		where: { id },
		data: {
			...(payload.sobok !== undefined ? { sobok: payload.sobok } : {}),
			...(payload.sobokPagesOrLines !== undefined
				? { sobokPagesOrLines: payload.sobokPagesOrLines }
				: {}),
			...(payload.sobokQuality !== undefined
				? { sobokQuality: payload.sobokQuality }
				: {}),
			...(payload.sobokAm !== undefined ? { sobokAm: payload.sobokAm } : {}),
			...(payload.manzil !== undefined ? { manzil: payload.manzil } : {}),
			...(payload.manzilParas !== undefined
				? { manzilParas: payload.manzilParas }
				: {}),
			...(payload.attendanceStatus !== undefined
				? { attendanceStatus: payload.attendanceStatus }
				: {}),
			...(payload.ustadNote !== undefined
				? { ustadNote: payload.ustadNote }
				: {}),
		},
		include: hefzDailyLogInclude,
	});
};

export const deleteHefzDailyLog = async (schoolId: number, id: number) => {
	const existing = await prisma.hefzDailyLog.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Hefz daily log not found");

	return prisma.hefzDailyLog.delete({ where: { id } });
};

/* ---------- Guardian & Student Progress Reports ---------- */

const buildStudentProgressReport = async (
	schoolId: number,
	studentId: number,
	query: HefzProgressQuery,
) => {
	const student = await prisma.student.findFirst({
		where: { id: studentId, schoolId },
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			isActive: true,
		},
	});
	if (!student) throw new AppError(404, "Student not found in this school");

	const enrollments = await prisma.hefzEnrollment.findMany({
		where: { schoolId, studentId },
		include: {
			ustad: {
				select: { id: true, employeeId: true, firstName: true, lastName: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	const enrollmentIds = enrollments.map((e) => e.id);

	const logDateFilter: { gte?: Date; lte?: Date } = {};
	if (query.fromDate) logDateFilter.gte = normalizeDate(query.fromDate);
	if (query.toDate) {
		const end = new Date(query.toDate);
		end.setUTCHours(23, 59, 59, 999);
		logDateFilter.lte = end;
	}

	const logs =
		enrollmentIds.length > 0
			? await prisma.hefzDailyLog.findMany({
					where: {
						schoolId,
						hefzEnrollmentId: { in: enrollmentIds },
						...(Object.keys(logDateFilter).length > 0
							? { logDate: logDateFilter }
							: {}),
					},
					orderBy: { logDate: "desc" },
					take: query.limit ?? 30,
				})
			: [];

	const attendanceSummary = {
		present: logs.filter(
			(l) => l.attendanceStatus === HefzAttendanceStatus.PRESENT,
		).length,
		absent: logs.filter(
			(l) => l.attendanceStatus === HefzAttendanceStatus.ABSENT,
		).length,
		late: logs.filter((l) => l.attendanceStatus === HefzAttendanceStatus.LATE)
			.length,
	};

	const sobokQualitySummary = {
		good: logs.filter((l) => l.sobokQuality === SobokQuality.GOOD).length,
		average: logs.filter((l) => l.sobokQuality === SobokQuality.AVERAGE).length,
		weak: logs.filter((l) => l.sobokQuality === SobokQuality.WEAK).length,
		revise: logs.filter((l) => l.sobokQuality === SobokQuality.REVISE).length,
	};

	return {
		student,
		enrollments,
		summary: {
			totalLogs: logs.length,
			attendance: attendanceSummary,
			sobokQuality: sobokQualitySummary,
			latestLog: logs[0] ?? null,
		},
		recentLogs: logs,
	};
};

export const getStudentHefzProgress = async (
	schoolId: number,
	studentId: number,
	requester: { userId: number; role: UserRole },
	query: HefzProgressQuery,
) => {
	if (requester.role === UserRole.GUARDIAN) {
		const guardian = await prisma.guardian.findFirst({
			where: { userId: requester.userId, schoolId },
		});
		if (!guardian) {
			throw new AppError(403, "Guardian profile not found in this school");
		}
		const link = await prisma.guardianStudent.findUnique({
			where: {
				guardianId_studentId: { guardianId: guardian.id, studentId },
			},
		});
		if (!link) {
			throw new AppError(
				403,
				"You are not authorized to view this student's Hefz progress",
			);
		}
	} else if (requester.role === UserRole.STUDENT) {
		const ownStudent = await prisma.student.findFirst({
			where: { userId: requester.userId, schoolId },
		});
		if (!ownStudent || ownStudent.id !== studentId) {
			throw new AppError(
				403,
				"You can only view your own Hefz progress report",
			);
		}
	}

	return buildStudentProgressReport(schoolId, studentId, query);
};

export const getGuardianChildrenHefzProgress = async (
	schoolId: number,
	userId: number,
	query: HefzProgressQuery,
) => {
	const guardian = await prisma.guardian.findFirst({
		where: { userId, schoolId },
		include: {
			students: { select: { studentId: true } },
		},
	});

	if (!guardian) {
		throw new AppError(404, "Guardian profile not found in this school");
	}

	const reports = await Promise.all(
		guardian.students.map((item) =>
			buildStudentProgressReport(schoolId, item.studentId, query),
		),
	);

	return reports;
};
