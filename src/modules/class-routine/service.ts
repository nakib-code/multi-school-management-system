import type {
	DayOfWeek,
	Prisma,
	UserRole,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

const routineInclude = {
	class: { select: { id: true, name: true, code: true } },
	section: { select: { id: true, name: true, code: true } },
	subject: { select: { id: true, name: true, code: true } },
	teacher: {
		select: { id: true, firstName: true, lastName: true, employeeId: true },
	},
};

function timesOverlap(
	startA: string,
	endA: string,
	startB: string,
	endB: string,
): boolean {
	return startA < endB && startB < endA;
}

async function assertNoRoutineConflicts(input: {
	schoolId: number;
	classId: number;
	sectionId: number | null;
	teacherId: number;
	dayOfWeek: DayOfWeek;
	startTime: string;
	endTime: string;
	roomNumber: string | null;
	academicYear: string;
	excludeId?: number;
}) {
	if (input.startTime >= input.endTime) {
		throw new AppError(400, "End time must be after start time");
	}

	const sameDayRoutines = await prisma.classRoutine.findMany({
		where: {
			schoolId: input.schoolId,
			academicYear: input.academicYear,
			dayOfWeek: input.dayOfWeek,
			isActive: true,
			...(input.excludeId ? { id: { not: input.excludeId } } : {}),
		},
		include: routineInclude,
	});

	for (const r of sameDayRoutines) {
		if (!timesOverlap(input.startTime, input.endTime, r.startTime, r.endTime)) {
			continue;
		}

		if (r.teacherId === input.teacherId) {
			throw new AppError(
				409,
				`Teacher conflict: ${r.teacher.firstName} is already scheduled ${r.startTime}–${r.endTime} on ${input.dayOfWeek}`,
			);
		}

		const sameClassAndSection =
			r.classId === input.classId &&
			(input.sectionId === null ||
				r.sectionId === null ||
				r.sectionId === input.sectionId);

		if (sameClassAndSection) {
			throw new AppError(
				409,
				`Class schedule conflict: ${r.class.name} already has ${r.subject.name} at ${r.startTime}–${r.endTime} on ${input.dayOfWeek}`,
			);
		}

		if (
			input.roomNumber &&
			r.roomNumber &&
			input.roomNumber.trim().toLowerCase() ===
				r.roomNumber.trim().toLowerCase()
		) {
			throw new AppError(
				409,
				`Room conflict: Room ${input.roomNumber} is occupied ${r.startTime}–${r.endTime} on ${input.dayOfWeek}`,
			);
		}
	}
}

export const createClassRoutine = async (
	schoolId: number,
	data: {
		classId: number;
		sectionId?: number | null;
		subjectId: number;
		teacherId: number;
		dayOfWeek: DayOfWeek;
		startTime: string;
		endTime: string;
		roomNumber?: string | null;
		academicYear: string;
	},
) => {
	const [cls, sub, teacher] = await Promise.all([
		prisma.schoolClass.findFirst({ where: { id: data.classId, schoolId } }),
		prisma.subject.findFirst({ where: { id: data.subjectId, schoolId } }),
		prisma.teacher.findFirst({ where: { id: data.teacherId, schoolId } }),
	]);
	if (!cls) throw new AppError(404, "Class not found in this school");
	if (!sub) throw new AppError(404, "Subject not found in this school");
	if (!teacher) throw new AppError(404, "Teacher not found in this school");

	if (data.sectionId) {
		const sec = await prisma.section.findFirst({
			where: { id: data.sectionId, schoolId, classId: data.classId },
		});
		if (!sec) throw new AppError(404, "Section not found for this class");
	}

	await assertNoRoutineConflicts({
		schoolId,
		classId: data.classId,
		sectionId: data.sectionId ?? null,
		teacherId: data.teacherId,
		dayOfWeek: data.dayOfWeek,
		startTime: data.startTime,
		endTime: data.endTime,
		roomNumber: data.roomNumber ?? null,
		academicYear: data.academicYear,
	});

	return prisma.classRoutine.create({
		data: {
			schoolId,
			classId: data.classId,
			sectionId: data.sectionId ?? null,
			subjectId: data.subjectId,
			teacherId: data.teacherId,
			dayOfWeek: data.dayOfWeek,
			startTime: data.startTime,
			endTime: data.endTime,
			roomNumber: data.roomNumber ?? null,
			academicYear: data.academicYear,
		},
		include: routineInclude,
	});
};

export const getClassRoutines = async (
	schoolId: number,
	actor: { userId: number; role: UserRole },
	filters?: {
		classId?: number;
		sectionId?: number;
		teacherId?: number;
		dayOfWeek?: DayOfWeek;
		academicYear?: string;
	},
) => {
	const where: Prisma.ClassRoutineWhereInput = {
		schoolId,
		isActive: true,
		...(filters?.classId ? { classId: filters.classId } : {}),
		...(filters?.sectionId ? { sectionId: filters.sectionId } : {}),
		...(filters?.teacherId ? { teacherId: filters.teacherId } : {}),
		...(filters?.dayOfWeek ? { dayOfWeek: filters.dayOfWeek } : {}),
		...(filters?.academicYear ? { academicYear: filters.academicYear } : {}),
	};

	// Scope automatically for TEACHER, STUDENT, GUARDIAN
	if (actor.role === "TEACHER") {
		const teacher = await prisma.teacher.findFirst({
			where: { userId: actor.userId, schoolId },
			select: { id: true },
		});
		if (!teacher) return [];
		where.teacherId = teacher.id;
	} else if (actor.role === "STUDENT") {
		const student = await prisma.student.findFirst({
			where: { userId: actor.userId, schoolId },
			select: {
				enrollments: {
					where: { status: "ACTIVE" },
					select: { classId: true, sectionId: true },
				},
			},
		});
		if (!student || student.enrollments.length === 0) return [];
		const classIds = student.enrollments.map((e) => e.classId);
		where.classId = { in: classIds };
	} else if (actor.role === "GUARDIAN") {
		const guardian = await prisma.guardian.findFirst({
			where: { userId: actor.userId, schoolId },
			select: {
				students: {
					select: {
						student: {
							select: {
								enrollments: {
									where: { status: "ACTIVE" },
									select: { classId: true },
								},
							},
						},
					},
				},
			},
		});
		const classIds =
			guardian?.students.flatMap((gs) =>
				gs.student.enrollments.map((e) => e.classId),
			) ?? [];
		if (classIds.length === 0) return [];
		where.classId = { in: classIds };
	}

	return prisma.classRoutine.findMany({
		where,
		include: routineInclude,
		orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
	});
};

export const updateClassRoutine = async (
	schoolId: number,
	id: number,
	data: Partial<{
		classId: number;
		sectionId: number | null;
		subjectId: number;
		teacherId: number;
		dayOfWeek: DayOfWeek;
		startTime: string;
		endTime: string;
		roomNumber: string | null;
		academicYear: string;
		isActive: boolean;
	}>,
) => {
	const existing = await prisma.classRoutine.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Class routine not found");

	await assertNoRoutineConflicts({
		schoolId,
		classId: data.classId ?? existing.classId,
		sectionId:
			data.sectionId !== undefined ? data.sectionId : existing.sectionId,
		teacherId: data.teacherId ?? existing.teacherId,
		dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
		startTime: data.startTime ?? existing.startTime,
		endTime: data.endTime ?? existing.endTime,
		roomNumber:
			data.roomNumber !== undefined ? data.roomNumber : existing.roomNumber,
		academicYear: data.academicYear ?? existing.academicYear,
		excludeId: id,
	});

	return prisma.classRoutine.update({
		where: { id },
		data,
		include: routineInclude,
	});
};

export const deleteClassRoutine = async (schoolId: number, id: number) => {
	const existing = await prisma.classRoutine.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Class routine not found");
	await prisma.classRoutine.delete({ where: { id } });
	return { id, deleted: true };
};
