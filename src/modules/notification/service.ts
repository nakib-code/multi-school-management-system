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
