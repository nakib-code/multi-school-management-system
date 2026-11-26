import type {
	AttendanceStatus,
	Prisma,
	UserRole,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { resolveScopedTeacherId } from "../../utils/ownershipScope.js";
import type {
	AttendanceFilterQuery,
	BulkAttendanceInput,
	CreateAttendanceInput,
	UpdateAttendanceInput,
} from "./interface.js";

const normalizeDate = (date: Date): Date => {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
};

const attendanceInclude = {
	student: {
		select: { id: true, studentId: true, firstName: true, lastName: true },
	},
	enrollment: {
		select: {
			id: true,
			academicYear: true,
			rollNumber: true,
			class: { select: { id: true, name: true } },
			section: { select: { id: true, name: true } },
		},
	},
	markedByUser: { select: { id: true, name: true, role: true } },
};

const assertTeacherCanMarkEnrollments = async (
	schoolId: number,
	actor: { userId: number; role: UserRole },
	enrollments: Array<{ classId: number; sectionId: number | null }>,
) => {
	if (actor.role !== "TEACHER") return;

	const teacherId = await resolveScopedTeacherId(schoolId, actor);
	if (!teacherId || teacherId < 0) {
		throw new AppError(403, "Teacher profile not found in this school");
	}

	const assignments = await prisma.teacherAssignment.findMany({
		where: { schoolId, teacherId, isActive: true },
		select: { classId: true, sectionId: true },
	});

	if (assignments.length === 0) {
		throw new AppError(
			403,
			"You have no active class assignments to mark attendance",
		);
	}

	for (const en of enrollments) {
		const allowed = assignments.some(
			(a) =>
				a.classId === en.classId &&
				(en.sectionId === null || a.sectionId === en.sectionId),
		);
		if (!allowed) {
			throw new AppError(
				403,
				"You can only mark attendance for students in your assigned classes/sections",
			);
		}
	}
};

const dispatchAttendanceAlerts = async (
	schoolId: number,
	markedBy: number,
	records: Array<{
		id: number;
		studentId: number;
		date: Date;
		status: AttendanceStatus;
		remarks: string | null;
		student: { firstName: string; lastName: string | null };
		enrollment: {
			class: { id: number; name: string };
			section: { id: number; name: string } | null;
		};
	}>,
) => {
	if (records.length === 0) return;

	const studentIds = Array.from(new Set(records.map((r) => r.studentId)));
	const students = await prisma.student.findMany({
		where: { id: { in: studentIds }, schoolId },
		select: {
			id: true,
			userId: true,
			guardians: {
				select: { guardian: { select: { userId: true } } },
			},
		},
	});

	const recipientsByStudent = new Map<number, number[]>();
	for (const s of students) {
		const ids = new Set<number>();
		if (s.userId) ids.add(s.userId);
		for (const g of s.guardians) {
			if (g.guardian.userId) ids.add(g.guardian.userId);
		}
		ids.delete(markedBy);
		recipientsByStudent.set(s.id, Array.from(ids));
	}

	const notifications: Prisma.NotificationCreateManyInput[] = [];
	for (const rec of records) {
		const recipientIds = recipientsByStudent.get(rec.studentId) ?? [];
		if (recipientIds.length === 0) continue;

		const fullName = `${rec.student.firstName} ${rec.student.lastName ?? ""}`.trim();
		const dateStr = rec.date.toISOString().slice(0, 10);
		const classLabel = rec.enrollment.section
			? `${rec.enrollment.class.name} (${rec.enrollment.section.name})`
			: rec.enrollment.class.name;

		const title = `Attendance Alert: ${fullName} — ${rec.status}`;
		const remarksText = rec.remarks ? ` Remarks: ${rec.remarks}` : "";
		const message = `${fullName} (${classLabel}) was marked ${rec.status} on ${dateStr}.${remarksText}`;

		const metadata: Prisma.InputJsonValue = {
			attendanceId: rec.id,
			studentId: rec.studentId,
			status: rec.status,
			date: dateStr,
			classId: rec.enrollment.class.id,
		};

		for (const recipientId of recipientIds) {
			notifications.push({
				schoolId,
				recipientId,
				title,
				message,
				type: "ATTENDANCE",
				metadata,
			});
		}
	}

	const chunkSize = 500;
	for (let i = 0; i < notifications.length; i += chunkSize) {
		await prisma.notification.createMany({
			data: notifications.slice(i, i + chunkSize),
		});
	}
};

export const createAttendance = async (
	schoolId: number,
	actor: { userId: number; role: UserRole },
	payload: CreateAttendanceInput,
) => {
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

	await assertTeacherCanMarkEnrollments(schoolId, actor, [enrollment]);

	const normalizedDate = normalizeDate(payload.date);

	const record = await prisma.attendance.upsert({
		where: {
			studentId_date: {
				studentId: payload.studentId,
				date: normalizedDate,
			},
		},
		create: {
			schoolId,
			studentId: payload.studentId,
			enrollmentId: payload.enrollmentId,
			date: normalizedDate,
			status: payload.status,
			markedBy: actor.userId,
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		update: {
			status: payload.status,
			markedBy: actor.userId,
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		include: attendanceInclude,
	});

	try {
		await dispatchAttendanceAlerts(schoolId, actor.userId, [record]);
	} catch (err) {
		console.error("Failed to dispatch attendance alert:", err);
	}

	return record;
};

export const bulkMarkAttendance = async (
	schoolId: number,
	actor: { userId: number; role: UserRole },
	payload: BulkAttendanceInput,
) => {
	const normalizedDate = normalizeDate(payload.date);

	const enrollmentIds = payload.records.map((r) => r.enrollmentId);
	const enrollments = await prisma.enrollment.findMany({
		where: { id: { in: enrollmentIds }, schoolId },
		select: { id: true, studentId: true, classId: true, sectionId: true },
	});

	const enrollmentMap = new Map(enrollments.map((e) => [e.id, e]));

	for (const rec of payload.records) {
		const matched = enrollmentMap.get(rec.enrollmentId);
		if (!matched || matched.studentId !== rec.studentId) {
			throw new AppError(
				404,
				`Enrollment ${rec.enrollmentId} does not match student ${rec.studentId} in this school`,
			);
		}
	}

	await assertTeacherCanMarkEnrollments(schoolId, actor, enrollments);

	const savedRecords = await prisma.$transaction(
		payload.records.map((rec) =>
			prisma.attendance.upsert({
				where: {
					studentId_date: {
						studentId: rec.studentId,
						date: normalizedDate,
					},
				},
				create: {
					schoolId,
					studentId: rec.studentId,
					enrollmentId: rec.enrollmentId,
					date: normalizedDate,
					status: rec.status,
					markedBy: actor.userId,
					...(rec.remarks !== undefined ? { remarks: rec.remarks } : {}),
				},
				update: {
					status: rec.status,
					markedBy: actor.userId,
					...(rec.remarks !== undefined ? { remarks: rec.remarks } : {}),
				},
				include: attendanceInclude,
			}),
		),
	);

	try {
		await dispatchAttendanceAlerts(schoolId, actor.userId, savedRecords);
	} catch (err) {
		console.error("Failed to dispatch bulk attendance alerts:", err);
	}

	return savedRecords;
};

export const getAttendances = async (
	schoolId: number,
	query: AttendanceFilterQuery,
) => {
	const dateFilter: { gte?: Date; lte?: Date } = {};
	if (query.fromDate) dateFilter.gte = normalizeDate(query.fromDate);
	if (query.toDate) {
		const end = new Date(query.toDate);
		end.setUTCHours(23, 59, 59, 999);
		dateFilter.lte = end;
	}

	const enrollmentFilter: Prisma.EnrollmentWhereInput = {};
	if (query.classId !== undefined) enrollmentFilter.classId = query.classId;
	if (query.sectionId !== undefined)
		enrollmentFilter.sectionId = query.sectionId;

	return prisma.attendance.findMany({
		where: {
			schoolId,
			...(query.studentId !== undefined ? { studentId: query.studentId } : {}),
			...(query.enrollmentId !== undefined
				? { enrollmentId: query.enrollmentId }
				: {}),
			...(query.status !== undefined ? { status: query.status } : {}),
			...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
			...(Object.keys(enrollmentFilter).length > 0
				? { enrollment: enrollmentFilter }
				: {}),
		},
		include: attendanceInclude,
		orderBy: { date: "desc" },
	});
};

export const getAttendanceById = async (schoolId: number, id: number) => {
	const attendance = await prisma.attendance.findFirst({
		where: { id, schoolId },
		include: attendanceInclude,
	});

	if (!attendance) {
		throw new AppError(404, "Attendance record not found");
	}

	return attendance;
};

export const updateAttendance = async (
	schoolId: number,
	id: number,
	actor: { userId: number; role: UserRole },
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

	await assertTeacherCanMarkEnrollments(schoolId, actor, [existing.enrollment]);

	const updated = await prisma.attendance.update({
		where: { id },
		data: {
			markedBy: actor.userId,
			...(payload.status !== undefined ? { status: payload.status } : {}),
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		include: attendanceInclude,
	});

	try {
		await dispatchAttendanceAlerts(schoolId, actor.userId, [updated]);
	} catch (err) {
		console.error("Failed to dispatch attendance update alert:", err);
	}

	return updated;
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
