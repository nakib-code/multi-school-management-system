import type { Response } from "express";
import type { NotificationType } from "../../generated/prisma/client.js";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import {
	createBulkNotifications,
	deleteNotification,
	getUnreadNotificationCount,
	getUserNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "./service.js";

export const createNotificationController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const result = await createBulkNotifications({
		actorRole: req.user.role,
		...(req.user.schoolId !== undefined
			? { actorSchoolId: req.user.schoolId }
			: {}),
		recipientIds: req.body.recipientIds,
		title: req.body.title,
		message: req.body.message,
		type: req.body.type,
		metadata: req.body.metadata,
	});
	return sendResponse(res, {
		statusCode: 201,
		message: "Notifications sent successfully",
		data: result,
	});
};

export const getNotificationsController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const q = (res.locals.validatedRequest?.query ?? req.query) as Record<
		string,
		unknown
	>;
	const result = await getUserNotifications(req.user.userId, req.user.schoolId, {
		page: q.page ? Number(q.page) : 1,
		limit: q.limit ? Number(q.limit) : 15,
		...(typeof q.isRead === "boolean" ? { isRead: q.isRead } : {}),
		...(typeof q.type === "string" ? { type: q.type as NotificationType } : {}),
	});
	return sendResponse(res, {
		statusCode: 200,
		message: "Notifications retrieved successfully",
		data: {
			notifications: result.notifications,
			unreadCount: result.unreadCount,
		},
		meta: result.meta,
	});
};

export const getUnreadCountController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const result = await getUnreadNotificationCount(req.user.userId);
	return sendResponse(res, {
		statusCode: 200,
		message: "Unread count retrieved successfully",
		data: result,
	});
};

export const markReadController = async (req: AuthRequest, res: Response) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const notification = await markNotificationRead(
		req.user.userId,
		Number(req.params.id),
	);
	return sendResponse(res, {
		statusCode: 200,
		message: "Notification marked as read",
		data: notification,
	});
};

export const markAllReadController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const result = await markAllNotificationsRead(req.user.userId);
	return sendResponse(res, {
		statusCode: 200,
		message: "All notifications marked as read",
		data: result,
	});
};

export const deleteNotificationController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const result = await deleteNotification(
		req.user.userId,
		Number(req.params.id),
	);
	return sendResponse(res, {
		statusCode: 200,
		message: "Notification deleted successfully",
		data: result,
	});
};
