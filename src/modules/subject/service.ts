import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type { CreateSubjectInput, UpdateSubjectInput } from "./interface.js";

export const createSubject = async (
	schoolId: number,
	payload: CreateSubjectInput,
) => {
	const existing = await prisma.subject.findFirst({
		where: { schoolId, code: payload.code },
	});

	if (existing) {
		throw new AppError(409, "Subject code already exists in this school");
	}

	return prisma.subject.create({
		data: {
			schoolId,
			name: payload.name,
			code: payload.code,
			...(payload.description !== undefined
				? { description: payload.description }
				: {}),
			...(payload.fullMarks !== undefined
				? { fullMarks: payload.fullMarks }
				: {}),
			...(payload.passMarks !== undefined
				? { passMarks: payload.passMarks }
				: {}),
		},
	});
};

export const getSubjects = async (schoolId: number) => {
	return prisma.subject.findMany({
		where: { schoolId },
		orderBy: { createdAt: "desc" },
	});
};

export const getActiveSubjects = async (schoolId: number) => {
	return prisma.subject.findMany({
		where: { schoolId, isActive: true },
		orderBy: { name: "asc" },
	});
};

export const getSubjectById = async (schoolId: number, id: number) => {
	const subject = await prisma.subject.findFirst({
		where: { id, schoolId },
	});

	if (!subject) {
		throw new AppError(404, "Subject not found");
	}

	return subject;
};

export const updateSubject = async (
	schoolId: number,
	id: number,
	payload: UpdateSubjectInput,
) => {
	const existing = await prisma.subject.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Subject not found");
	}

	if (payload.code && payload.code !== existing.code) {
		const duplicate = await prisma.subject.findFirst({
			where: { schoolId, code: payload.code, id: { not: id } },
		});
		if (duplicate) {
			throw new AppError(409, "Subject code already exists in this school");
		}
	}

	const nextFull = payload.fullMarks ?? existing.fullMarks;
	const nextPass = payload.passMarks ?? existing.passMarks;
	if (nextPass > nextFull) {
		throw new AppError(400, "Pass marks cannot exceed full marks");
	}

	return prisma.subject.update({
		where: { id },
		data: {
			...(payload.name !== undefined ? { name: payload.name } : {}),
			...(payload.code !== undefined ? { code: payload.code } : {}),
			...(payload.description !== undefined
				? { description: payload.description }
				: {}),
			...(payload.fullMarks !== undefined
				? { fullMarks: payload.fullMarks }
				: {}),
			...(payload.passMarks !== undefined
				? { passMarks: payload.passMarks }
				: {}),
			...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
		},
	});
};

export const toggleSubjectStatus = async (schoolId: number, id: number) => {
	const existing = await prisma.subject.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Subject not found");
	}

	return prisma.subject.update({
		where: { id },
		data: { isActive: !existing.isActive },
	});
};

export const deleteSubject = async (schoolId: number, id: number) => {
	const existing = await prisma.subject.findFirst({
		where: { id, schoolId },
		include: {
			_count: {
				select: { teacherAssignments: true, results: true },
			},
		},
	});

	if (!existing) {
		throw new AppError(404, "Subject not found");
	}

	if (existing._count.teacherAssignments > 0 || existing._count.results > 0) {
		throw new AppError(
			400,
			"Cannot delete subject with existing assignments or results",
		);
	}

	return prisma.subject.delete({ where: { id } });
};
