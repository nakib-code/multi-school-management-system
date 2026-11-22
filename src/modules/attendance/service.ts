import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
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

export const createAttendance = async (
	schoolId: number,
	markedBy: number,
	payload: CreateAttendanceInput,
) => {
	const enrollment = await prisma.enrollment.findFirst({
		where: {
			id: payload.enrollmentId,
			schoolId,
			studentId: payload.studentId,
		},
	});

	if (!enrollment) {
		throw new AppError(
			404,
			"Enrollment not found for this student in this school",
		);
	}

	const normalizedDate = normalizeDate(payload.date);

	return prisma.attendance.upsert({
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
			markedBy,
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		update: {
			status: payload.status,
			markedBy,
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		include: attendanceInclude,
	});
};

export const bulkMarkAttendance = async (
	schoolId: number,
	markedBy: number,
	payload: BulkAttendanceInput,
) => {
	const normalizedDate = normalizeDate(payload.date);

	const enrollmentIds = payload.records.map((r) => r.enrollmentId);
	const enrollments = await prisma.enrollment.findMany({
		where: { id: { in: enrollmentIds }, schoolId },
		select: { id: true, studentId: true },
	});

	const enrollmentMap = new Map(enrollments.map((e) => [e.id, e.studentId]));

	for (const rec of payload.records) {
		if (enrollmentMap.get(rec.enrollmentId) !== rec.studentId) {
			throw new AppError(
				404,
				`Enrollment ${rec.enrollmentId} does not match student ${rec.studentId} in this school`,
			);
		}
	}

	return prisma.$transaction(
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
					markedBy,
					...(rec.remarks !== undefined ? { remarks: rec.remarks } : {}),
				},
				update: {
					status: rec.status,
					markedBy,
					...(rec.remarks !== undefined ? { remarks: rec.remarks } : {}),
				},
				include: attendanceInclude,
			}),
		),
	);
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

	return prisma.attendance.findMany({
		where: {
			schoolId,
			...(query.studentId !== undefined ? { studentId: query.studentId } : {}),
			...(query.enrollmentId !== undefined
				? { enrollmentId: query.enrollmentId }
				: {}),
			...(query.status !== undefined ? { status: query.status } : {}),
			...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
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
	markedBy: number,
	payload: UpdateAttendanceInput,
) => {
	const existing = await prisma.attendance.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Attendance record not found");
	}

	return prisma.attendance.update({
		where: { id },
		data: {
			markedBy,
			...(payload.status !== undefined ? { status: payload.status } : {}),
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		include: attendanceInclude,
	});
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
