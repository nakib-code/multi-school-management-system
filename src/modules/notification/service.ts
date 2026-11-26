import type { NotificationType, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

export const createNotification = async (input: {
	recipientId: number;
	schoolId?: number | null;
	title: string;
	message: string;
	type?: NotificationType;
	metadata?: Record<string, unknown>;
}) => {
	return prisma.notification.create({
		data: {
			recipientId: input.recipientId,
			schoolId: input.schoolId ?? null,
			title: input.title,
			message: input.message,
			type: input.type ?? "SYSTEM",
			...(input.metadata
				? { metadata: input.metadata as Prisma.InputJsonValue }
				: {}),
		},
	});
};

export const createBulkNotifications = async (input: {
	actorRole: string;
	actorSchoolId?: number;
	recipientIds: number[];
	title: string;
	message: string;
	type?: NotificationType;
	metadata?: Record<string, unknown>;
}) => {
	const users = await prisma.user.findMany({
		where: {
			id: { in: input.recipientIds },
			status: "ACTIVE",
			...(input.actorRole !== "SUPER_ADMIN" && input.actorSchoolId
				? { schoolId: input.actorSchoolId }
				: {}),
		},
		select: { id: true, schoolId: true },
	});

	if (users.length === 0) {
		throw new AppError(404, "No valid active recipients found in your scope");
	}

	const created = await prisma.notification.createMany({
		data: users.map((u) => ({
			recipientId: u.id,
			schoolId: u.schoolId,
			title: input.title,
			message: input.message,
			type: input.type ?? "ANNOUNCEMENT",
			...(input.metadata
				? { metadata: input.metadata as Prisma.InputJsonValue }
				: {}),
		})),
	});

	return { count: created.count };
};

export const broadcastNotifications = async (input: {
	actorUserId: number;
	actorRole: string;
	actorSchoolId?: number;
	schoolId?: number;
	title: string;
	message: string;
	type: "ANNOUNCEMENT" | "EMERGENCY";
	audience: "ALL" | "TEACHERS" | "GUARDIANS" | "STUDENTS" | "CLASS";
	classId?: number;
	sectionId?: number;
}) => {
	const targetSchoolId =
		input.actorRole === "SUPER_ADMIN"
			? (input.schoolId ?? input.actorSchoolId)
			: input.actorSchoolId;

	if (!targetSchoolId) {
		throw new AppError(400, "School ID is required for broadcasting notices");
	}

	if (input.actorRole === "TEACHER") {
		if (input.audience !== "CLASS" || !input.classId) {
			throw new AppError(
				403,
				"Teachers can only send notices to their assigned classes",
			);
		}
		const teacher = await prisma.teacher.findFirst({
			where: { userId: input.actorUserId, schoolId: targetSchoolId },
			select: { id: true },
		});
		if (!teacher) {
			throw new AppError(403, "Teacher profile not found in this school");
		}
		const assignment = await prisma.teacherAssignment.findFirst({
			where: {
				schoolId: targetSchoolId,
				teacherId: teacher.id,
				classId: input.classId,
				isActive: true,
				...(input.sectionId ? { sectionId: input.sectionId } : {}),
			},
			select: { id: true },
		});
		if (!assignment) {
			throw new AppError(
				403,
				"You are not assigned to this class/section and cannot broadcast to it",
			);
		}
	}

	const recipientSet = new Set<number>();

	if (input.audience === "CLASS") {
		if (!input.classId) {
			throw new AppError(400, "Class ID is required for CLASS audience");
		}
		const enrollments = await prisma.enrollment.findMany({
			where: {
				schoolId: targetSchoolId,
				classId: input.classId,
				...(input.sectionId ? { sectionId: input.sectionId } : {}),
				status: "ACTIVE",
			},
			select: {
				student: {
					select: {
						userId: true,
						guardians: {
							select: { guardian: { select: { userId: true } } },
						},
					},
				},
			},
		});
		for (const en of enrollments) {
			if (en.student.userId) recipientSet.add(en.student.userId);
			for (const g of en.student.guardians) {
				if (g.guardian.userId) recipientSet.add(g.guardian.userId);
			}
		}
	} else {
		const roleFilter =
			input.audience === "TEACHERS"
				? "TEACHER"
				: input.audience === "GUARDIANS"
					? "GUARDIAN"
					: input.audience === "STUDENTS"
						? "STUDENT"
						: undefined;

		const users = await prisma.user.findMany({
			where: {
				schoolId: targetSchoolId,
				status: "ACTIVE",
				...(roleFilter ? { role: roleFilter } : {}),
			},
			select: { id: true },
		});
		for (const u of users) {
			recipientSet.add(u.id);
		}
	}

	recipientSet.delete(input.actorUserId);
	const recipientIds = Array.from(recipientSet);

	if (recipientIds.length === 0) {
		return { sentCount: 0 };
	}

	const metadata: Prisma.InputJsonValue = {
		audience: input.audience,
		...(input.classId ? { classId: input.classId } : {}),
		...(input.sectionId ? { sectionId: input.sectionId } : {}),
		sentByUserId: input.actorUserId,
		sentByRole: input.actorRole,
	};

	const chunkSize = 500;
	let sentCount = 0;
	for (let i = 0; i < recipientIds.length; i += chunkSize) {
		const chunk = recipientIds.slice(i, i + chunkSize);
		const created = await prisma.notification.createMany({
			data: chunk.map((recipientId) => ({
				schoolId: targetSchoolId,
				recipientId,
				title: input.title,
				message: input.message,
				type: input.type,
				metadata,
			})),
		});
		sentCount += created.count;
	}

	return { sentCount };
};

export const getUserNotifications = async (
	userId: number,
	schoolId: number | undefined,
	filters: {
		page?: number;
		limit?: number;
		isRead?: boolean;
		type?: NotificationType;
	},
) => {
	const page = Math.max(1, Number(filters.page) || 1);
	const limit = Math.min(50, Math.max(1, Number(filters.limit) || 15));
	const skip = (page - 1) * limit;

	const where: Prisma.NotificationWhereInput = {
		recipientId: userId,
		...(schoolId !== undefined ? { OR: [{ schoolId }, { schoolId: null }] } : {}),
		...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
		...(filters.type ? { type: filters.type } : {}),
	};

	const [notifications, total, unreadCount] = await Promise.all([
		prisma.notification.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.notification.count({ where }),
		prisma.notification.count({
			where: { recipientId: userId, isRead: false },
		}),
	]);

	return {
		notifications,
		unreadCount,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	};
};

export const getUnreadNotificationCount = async (userId: number) => {
	const unreadCount = await prisma.notification.count({
		where: { recipientId: userId, isRead: false },
	});
	return { unreadCount };
};

export const markNotificationRead = async (userId: number, id: number) => {
	const existing = await prisma.notification.findFirst({
		where: { id, recipientId: userId },
	});
	if (!existing) {
		throw new AppError(404, "Notification not found");
	}
	return prisma.notification.update({
		where: { id },
		data: { isRead: true, readAt: existing.readAt ?? new Date() },
	});
};

export const markAllNotificationsRead = async (userId: number) => {
	const result = await prisma.notification.updateMany({
		where: { recipientId: userId, isRead: false },
		data: { isRead: true, readAt: new Date() },
	});
	return { updatedCount: result.count };
};

export const deleteNotification = async (userId: number, id: number) => {
	const existing = await prisma.notification.findFirst({
		where: { id, recipientId: userId },
	});
	if (!existing) {
		throw new AppError(404, "Notification not found");
	}
	await prisma.notification.delete({ where: { id } });
	return { id, deleted: true };
};
