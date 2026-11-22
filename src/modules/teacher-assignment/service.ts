import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreateTeacherAssignmentInput,
	TeacherAssignmentFilterQuery,
	UpdateTeacherAssignmentInput,
} from "./interface.js";

const verifyAssignmentRefs = async (
	schoolId: number,
	refs: {
		teacherId: number;
		classId: number;
		sectionId: number;
		subjectId: number;
	},
) => {
	const [teacher, schoolClass, section, subject] = await Promise.all([
		prisma.teacher.findFirst({ where: { id: refs.teacherId, schoolId } }),
		prisma.schoolClass.findFirst({ where: { id: refs.classId, schoolId } }),
		prisma.section.findFirst({ where: { id: refs.sectionId, schoolId } }),
		prisma.subject.findFirst({ where: { id: refs.subjectId, schoolId } }),
	]);

	if (!teacher) throw new AppError(404, "Teacher not found in this school");
	if (!schoolClass) throw new AppError(404, "Class not found in this school");
	if (!section || section.classId !== refs.classId) {
		throw new AppError(404, "Section not found for the specified class");
	}
	if (!subject) throw new AppError(404, "Subject not found in this school");
};

const assignmentInclude = {
	teacher: {
		select: { id: true, firstName: true, lastName: true, employeeId: true },
	},
	class: { select: { id: true, name: true, code: true } },
	section: { select: { id: true, name: true } },
	subject: { select: { id: true, name: true, code: true } },
};

export const createTeacherAssignment = async (
	schoolId: number,
	payload: CreateTeacherAssignmentInput,
) => {
	await verifyAssignmentRefs(schoolId, payload);

	const duplicate = await prisma.teacherAssignment.findFirst({
		where: {
			teacherId: payload.teacherId,
			sectionId: payload.sectionId,
			subjectId: payload.subjectId,
			academicYear: payload.academicYear,
		},
	});

	if (duplicate) {
		throw new AppError(
			409,
			"This teacher is already assigned to this section and subject for this academic year",
		);
	}

	return prisma.teacherAssignment.create({
		data: {
			schoolId,
			teacherId: payload.teacherId,
			classId: payload.classId,
			sectionId: payload.sectionId,
			subjectId: payload.subjectId,
			academicYear: payload.academicYear,
		},
		include: assignmentInclude,
	});
};

export const getTeacherAssignments = async (
	schoolId: number,
	query: TeacherAssignmentFilterQuery,
) => {
	return prisma.teacherAssignment.findMany({
		where: {
			schoolId,
			...(query.teacherId !== undefined ? { teacherId: query.teacherId } : {}),
			...(query.classId !== undefined ? { classId: query.classId } : {}),
			...(query.sectionId !== undefined ? { sectionId: query.sectionId } : {}),
			...(query.subjectId !== undefined ? { subjectId: query.subjectId } : {}),
			...(query.academicYear !== undefined
				? { academicYear: query.academicYear }
				: {}),
			...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
		},
		include: assignmentInclude,
		orderBy: { createdAt: "desc" },
	});
};

export const getTeacherAssignmentById = async (
	schoolId: number,
	id: number,
) => {
	const assignment = await prisma.teacherAssignment.findFirst({
		where: { id, schoolId },
		include: assignmentInclude,
	});

	if (!assignment) {
		throw new AppError(404, "Teacher assignment not found");
	}

	return assignment;
};

export const updateTeacherAssignment = async (
	schoolId: number,
	id: number,
	payload: UpdateTeacherAssignmentInput,
) => {
	const existing = await prisma.teacherAssignment.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Teacher assignment not found");
	}

	const nextRefs = {
		teacherId: payload.teacherId ?? existing.teacherId,
		classId: payload.classId ?? existing.classId,
		sectionId: payload.sectionId ?? existing.sectionId,
		subjectId: payload.subjectId ?? existing.subjectId,
	};
	const nextAcademicYear = payload.academicYear ?? existing.academicYear;

	await verifyAssignmentRefs(schoolId, nextRefs);

	const duplicate = await prisma.teacherAssignment.findFirst({
		where: {
			teacherId: nextRefs.teacherId,
			sectionId: nextRefs.sectionId,
			subjectId: nextRefs.subjectId,
			academicYear: nextAcademicYear,
			id: { not: id },
		},
	});

	if (duplicate) {
		throw new AppError(409, "Duplicate teacher assignment exists");
	}

	return prisma.teacherAssignment.update({
		where: { id },
		data: {
			...(payload.teacherId !== undefined
				? { teacherId: payload.teacherId }
				: {}),
			...(payload.classId !== undefined ? { classId: payload.classId } : {}),
			...(payload.sectionId !== undefined
				? { sectionId: payload.sectionId }
				: {}),
			...(payload.subjectId !== undefined
				? { subjectId: payload.subjectId }
				: {}),
			...(payload.academicYear !== undefined
				? { academicYear: payload.academicYear }
				: {}),
			...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
		},
		include: assignmentInclude,
	});
};

export const deleteTeacherAssignment = async (schoolId: number, id: number) => {
	const existing = await prisma.teacherAssignment.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Teacher assignment not found");
	}

	return prisma.teacherAssignment.delete({ where: { id } });
};
