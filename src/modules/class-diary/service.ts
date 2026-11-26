import type { Prisma, UserRole } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	resolveScopedStudentIds,
	resolveScopedTeacherId,
} from "../../utils/ownershipScope.js";
import type {
	ClassDiaryFilterQuery,
	CreateClassDiaryInput,
	UpdateClassDiaryInput,
} from "./interface.js";

const normalizeDate = (date: Date): Date => {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
};

const endOfDay = (date: Date): Date => {
	const d = new Date(date);
	d.setUTCHours(23, 59, 59, 999);
	return d;
};

const diaryInclude = {
	class: { select: { id: true, name: true, code: true } },
	section: { select: { id: true, name: true, code: true } },
	subject: { select: { id: true, name: true, code: true } },
	teacher: {
		select: { id: true, firstName: true, lastName: true, employeeId: true },
	},
	createdBy: { select: { id: true, name: true, role: true } },
};

const assertTeacherAssigned = async (
	schoolId: number,
	teacherId: number,
	classId: number,
	sectionId?: number | null,
) => {
	const assignment = await prisma.teacherAssignment.findFirst({
		where: {
			schoolId,
			teacherId,
			classId,
			isActive: true,
			...(sectionId ? { sectionId } : {}),
		},
		select: { id: true },
	});

	if (!assignment) {
		throw new AppError(
			403,
			"You are not assigned to this class/section to post or manage its diary",
		);
	}
};

const notifyClassDiaryRecipients = async (diary: {
	id: number;
	schoolId: number;
	classId: number;
	sectionId: number | null;
	diaryDate: Date;
	title: string | null;
	classwork: string;
	homework: string | null;
	createdById: number;
	class: { name: string };
	section: { name: string } | null;
	subject: { name: string } | null;
}) => {
	const enrollments = await prisma.enrollment.findMany({
		where: {
			schoolId: diary.schoolId,
			classId: diary.classId,
			...(diary.sectionId !== null ? { sectionId: diary.sectionId } : {}),
			status: "ACTIVE",
		},
		select: {
			student: {
				select: {
					userId: true,
					guardians: {
						select: {
							guardian: { select: { userId: true } },
						},
					},
				},
			},
		},
	});

	const recipientSet = new Set<number>();
	for (const en of enrollments) {
		if (en.student.userId) recipientSet.add(en.student.userId);
		for (const g of en.student.guardians) {
			if (g.guardian.userId) recipientSet.add(g.guardian.userId);
		}
	}
	recipientSet.delete(diary.createdById);

	const recipientIds = Array.from(recipientSet);
	if (recipientIds.length === 0) return 0;

	const dateLabel = diary.diaryDate.toISOString().slice(0, 10);
	const subjectLabel = diary.subject ? ` (${diary.subject.name})` : "";
	const sectionLabel = diary.section ? ` - ${diary.section.name}` : "";
	const title =
		diary.title?.trim() ||
		`Daily Diary${subjectLabel} — ${diary.class.name}${sectionLabel}`;
	const hwSnippet = diary.homework
		? ` | Homework: ${diary.homework.slice(0, 140)}`
		: "";
	const message = `${dateLabel}: ${diary.classwork.slice(0, 180)}${hwSnippet}`;

	const metadata: Prisma.InputJsonValue = {
		diaryId: diary.id,
		classId: diary.classId,
		sectionId: diary.sectionId,
		diaryDate: dateLabel,
	};

	const chunkSize = 500;
	let sent = 0;
	for (let i = 0; i < recipientIds.length; i += chunkSize) {
		const chunk = recipientIds.slice(i, i + chunkSize);
		const res = await prisma.notification.createMany({
			data: chunk.map((recipientId) => ({
				schoolId: diary.schoolId,
				recipientId,
				title,
				message,
				type: "DIARY" as const,
				metadata,
			})),
		});
		sent += res.count;
	}

	return sent;
};

export const createClassDiary = async (
	schoolId: number,
	actor: { userId: number; role: UserRole },
	payload: CreateClassDiaryInput,
) => {
	const schoolClass = await prisma.schoolClass.findFirst({
		where: { id: payload.classId, schoolId },
		select: { id: true },
	});
	if (!schoolClass) throw new AppError(404, "Class not found in this school");

	if (payload.sectionId) {
		const section = await prisma.section.findFirst({
			where: { id: payload.sectionId, schoolId, classId: payload.classId },
			select: { id: true },
		});
		if (!section) {
			throw new AppError(404, "Section not found for the selected class");
		}
	}

	let resolvedTeacherId = payload.teacherId ?? null;
	if (actor.role === "TEACHER") {
		const teacherId = await resolveScopedTeacherId(schoolId, actor);
		if (!teacherId || teacherId < 0) {
			throw new AppError(403, "Teacher profile not found in this school");
		}
		await assertTeacherAssigned(
			schoolId,
			teacherId,
			payload.classId,
			payload.sectionId,
		);
		resolvedTeacherId = teacherId;
	}

	const diary = await prisma.classDiary.create({
		data: {
			schoolId,
			classId: payload.classId,
			sectionId: payload.sectionId ?? null,
			subjectId: payload.subjectId ?? null,
			teacherId: resolvedTeacherId,
			createdById: actor.userId,
			diaryDate: normalizeDate(payload.diaryDate),
			title: payload.title ?? null,
			classwork: payload.classwork,
			homework: payload.homework ?? null,
			dueDate: payload.dueDate ? normalizeDate(payload.dueDate) : null,
			attachmentUrl: payload.attachmentUrl ?? null,
		},
		include: diaryInclude,
	});

	// Fire-and-forget zero-cost in-app notifications to guardians & students
	let notifiedCount = 0;
	try {
		notifiedCount = await notifyClassDiaryRecipients(diary);
	} catch (err) {
		console.error("Failed to dispatch class diary notifications:", err);
	}

	return { ...diary, notifiedCount };
};

export const getClassDiaries = async (
	schoolId: number,
	actor: { userId: number; role: UserRole },
	query: ClassDiaryFilterQuery,
) => {
	const where: Prisma.ClassDiaryWhereInput = { schoolId };

	if (query.classId !== undefined) where.classId = query.classId;
	if (query.sectionId !== undefined) where.sectionId = query.sectionId;
	if (query.subjectId !== undefined) where.subjectId = query.subjectId;

	if (query.date) {
		where.diaryDate = {
			gte: normalizeDate(query.date),
			lte: endOfDay(query.date),
		};
	} else if (query.fromDate || query.toDate) {
		where.diaryDate = {
			...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
			...(query.toDate ? { lte: endOfDay(query.toDate) } : {}),
		};
	}

	if (actor.role === "GUARDIAN" || actor.role === "STUDENT") {
		const studentIds = await resolveScopedStudentIds(schoolId, actor);
		if (!studentIds || studentIds.length === 0) return [];

		const enrollments = await prisma.enrollment.findMany({
			where: { schoolId, studentId: { in: studentIds }, status: "ACTIVE" },
			select: { classId: true, sectionId: true },
		});
		if (enrollments.length === 0) return [];

		where.OR = enrollments.map((en) =>
			en.sectionId !== null
				? {
						classId: en.classId,
						OR: [{ sectionId: en.sectionId }, { sectionId: null }],
					}
				: { classId: en.classId },
		);
	} else if (actor.role === "TEACHER") {
		const teacherId = await resolveScopedTeacherId(schoolId, actor);
		if (!teacherId || teacherId < 0) return [];

		const assignments = await prisma.teacherAssignment.findMany({
			where: { schoolId, teacherId, isActive: true },
			select: { classId: true, sectionId: true },
		});
		if (assignments.length === 0) return [];

		where.OR = assignments.map((a) => ({
			classId: a.classId,
			OR: [{ sectionId: a.sectionId }, { sectionId: null }],
		}));
	}

	return prisma.classDiary.findMany({
		where,
		include: diaryInclude,
		orderBy: [{ diaryDate: "desc" }, { createdAt: "desc" }],
	});
};

export const getClassDiaryById = async (
	schoolId: number,
	id: number,
	actor: { userId: number; role: UserRole },
) => {
	const diary = await prisma.classDiary.findFirst({
		where: { id, schoolId },
		include: diaryInclude,
	});
	if (!diary) throw new AppError(404, "Class diary entry not found");

	if (actor.role === "GUARDIAN" || actor.role === "STUDENT") {
		const studentIds = await resolveScopedStudentIds(schoolId, actor);
		if (!studentIds || studentIds.length === 0) {
			throw new AppError(403, "You do not have access to this diary entry");
		}
		const match = await prisma.enrollment.findFirst({
			where: {
				schoolId,
				studentId: { in: studentIds },
				classId: diary.classId,
				status: "ACTIVE",
				...(diary.sectionId !== null ? { sectionId: diary.sectionId } : {}),
			},
			select: { id: true },
		});
		if (!match) {
			throw new AppError(403, "You do not have access to this diary entry");
		}
	} else if (actor.role === "TEACHER") {
		const teacherId = await resolveScopedTeacherId(schoolId, actor);
		if (!teacherId || teacherId < 0) {
			throw new AppError(403, "Teacher profile not found");
		}
		await assertTeacherAssigned(
			schoolId,
			teacherId,
			diary.classId,
			diary.sectionId,
		);
	}

	return diary;
};

export const updateClassDiary = async (
	schoolId: number,
	id: number,
	actor: { userId: number; role: UserRole },
	payload: UpdateClassDiaryInput,
) => {
	const existing = await prisma.classDiary.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Class diary entry not found");

	const nextClassId = payload.classId ?? existing.classId;
	const nextSectionId =
		payload.sectionId !== undefined ? payload.sectionId : existing.sectionId;

	if (actor.role === "TEACHER") {
		const teacherId = await resolveScopedTeacherId(schoolId, actor);
		if (!teacherId || teacherId < 0) {
			throw new AppError(403, "Teacher profile not found in this school");
		}
		await assertTeacherAssigned(schoolId, teacherId, nextClassId, nextSectionId);
	}

	return prisma.classDiary.update({
		where: { id },
		data: {
			...(payload.classId !== undefined ? { classId: payload.classId } : {}),
			...(payload.sectionId !== undefined
				? { sectionId: payload.sectionId }
				: {}),
			...(payload.subjectId !== undefined
				? { subjectId: payload.subjectId }
				: {}),
			...(payload.diaryDate !== undefined
				? { diaryDate: normalizeDate(payload.diaryDate) }
				: {}),
			...(payload.title !== undefined ? { title: payload.title } : {}),
			...(payload.classwork !== undefined
				? { classwork: payload.classwork }
				: {}),
			...(payload.homework !== undefined ? { homework: payload.homework } : {}),
			...(payload.dueDate !== undefined
				? { dueDate: payload.dueDate ? normalizeDate(payload.dueDate) : null }
				: {}),
			...(payload.attachmentUrl !== undefined
				? { attachmentUrl: payload.attachmentUrl }
				: {}),
		},
		include: diaryInclude,
	});
};

export const deleteClassDiary = async (
	schoolId: number,
	id: number,
	actor: { userId: number; role: UserRole },
) => {
	const existing = await prisma.classDiary.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Class diary entry not found");

	if (actor.role === "TEACHER") {
		const teacherId = await resolveScopedTeacherId(schoolId, actor);
		if (!teacherId || teacherId < 0) {
			throw new AppError(403, "Teacher profile not found in this school");
		}
		await assertTeacherAssigned(
			schoolId,
			teacherId,
			existing.classId,
			existing.sectionId,
		);
	}

	return prisma.classDiary.delete({ where: { id } });
};
