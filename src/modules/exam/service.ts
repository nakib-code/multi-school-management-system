import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreateExamInput,
	ExamFilterQuery,
	UpdateExamInput,
} from "./interface.js";

const examInclude = {
	class: { select: { id: true, name: true, code: true } },
	section: { select: { id: true, name: true } },
	_count: { select: { results: true } },
};

export const createExam = async (
	schoolId: number,
	payload: CreateExamInput,
) => {
	const schoolClass = await prisma.schoolClass.findFirst({
		where: { id: payload.classId, schoolId },
	});
	if (!schoolClass) throw new AppError(404, "Class not found in this school");

	if (payload.sectionId !== undefined) {
		const section = await prisma.section.findFirst({
			where: { id: payload.sectionId, schoolId, classId: payload.classId },
		});
		if (!section) {
			throw new AppError(404, "Section not found for the specified class");
		}
	}

	return prisma.exam.create({
		data: {
			schoolId,
			classId: payload.classId,
			name: payload.name,
			type: payload.type,
			academicYear: payload.academicYear,
			startDate: payload.startDate,
			endDate: payload.endDate,
			...(payload.sectionId !== undefined
				? { sectionId: payload.sectionId }
				: {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
		},
		include: examInclude,
	});
};

export const getExams = async (schoolId: number, query: ExamFilterQuery) => {
	return prisma.exam.findMany({
		where: {
			schoolId,
			...(query.classId !== undefined ? { classId: query.classId } : {}),
			...(query.sectionId !== undefined ? { sectionId: query.sectionId } : {}),
			...(query.type !== undefined ? { type: query.type } : {}),
			...(query.status !== undefined ? { status: query.status } : {}),
			...(query.academicYear !== undefined
				? { academicYear: query.academicYear }
				: {}),
		},
		include: examInclude,
		orderBy: { startDate: "desc" },
	});
};

export const getExamById = async (schoolId: number, id: number) => {
	const exam = await prisma.exam.findFirst({
		where: { id, schoolId },
		include: examInclude,
	});

	if (!exam) throw new AppError(404, "Exam not found");
	return exam;
};

export const updateExam = async (
	schoolId: number,
	id: number,
	payload: UpdateExamInput,
) => {
	const existing = await prisma.exam.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Exam not found");

	const nextClassId = payload.classId ?? existing.classId;
	const nextSectionId =
		payload.sectionId !== undefined ? payload.sectionId : existing.sectionId;
	const nextStartDate = payload.startDate ?? existing.startDate;
	const nextEndDate = payload.endDate ?? existing.endDate;

	if (nextEndDate < nextStartDate) {
		throw new AppError(400, "End date must be on or after start date");
	}

	if (payload.classId !== undefined) {
		const schoolClass = await prisma.schoolClass.findFirst({
			where: { id: nextClassId, schoolId },
		});
		if (!schoolClass) throw new AppError(404, "Class not found in this school");
	}

	if (nextSectionId !== null) {
		const section = await prisma.section.findFirst({
			where: { id: nextSectionId, schoolId, classId: nextClassId },
		});
		if (!section) {
			throw new AppError(404, "Section not found for the specified class");
		}
	}

	return prisma.exam.update({
		where: { id },
		data: {
			...(payload.classId !== undefined ? { classId: payload.classId } : {}),
			...(payload.sectionId !== undefined
				? { sectionId: payload.sectionId }
				: {}),
			...(payload.name !== undefined ? { name: payload.name } : {}),
			...(payload.type !== undefined ? { type: payload.type } : {}),
			...(payload.academicYear !== undefined
				? { academicYear: payload.academicYear }
				: {}),
			...(payload.startDate !== undefined
				? { startDate: payload.startDate }
				: {}),
			...(payload.endDate !== undefined ? { endDate: payload.endDate } : {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
		},
		include: examInclude,
	});
};

export const deleteExam = async (schoolId: number, id: number) => {
	const existing = await prisma.exam.findFirst({
		where: { id, schoolId },
		include: { _count: { select: { results: true } } },
	});

	if (!existing) throw new AppError(404, "Exam not found");
	if (existing._count.results > 0) {
		throw new AppError(400, "Cannot delete exam with existing results");
	}

	return prisma.exam.delete({ where: { id } });
};
