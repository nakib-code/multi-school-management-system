import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	broadcastNotificationController,
	createNotificationController,
	deleteNotificationController,
	getNotificationsController,
	getUnreadCountController,
	markAllReadController,
	markReadController,
} from "./controller.js";
import {
	broadcastNotificationSchema,
	createNotificationSchema,
	getNotificationsQuerySchema,
	notificationIdSchema,
} from "./validation.js";

const router = Router();

const broadcastLimiter = createRateLimiter({
	windowMs: 10 * 60 * 1000,
	max: 15,
	keyPrefix: "notif-broadcast",
	message: "Too many broadcast notices sent. Please wait a few minutes.",
});

router.get(
	"/",
	authenticate,
	validateRequest(getNotificationsQuerySchema),
	getNotificationsController,
);

router.get("/unread-count", authenticate, getUnreadCountController);

router.post(
	"/",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	validateRequest(createNotificationSchema),
	createNotificationController,
);

router.post(
	"/broadcast",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	broadcastLimiter,
	validateRequest(broadcastNotificationSchema),
	broadcastNotificationController,
);

router.patch("/read-all", authenticate, markAllReadController);

router.patch(
	"/:id/read",
	authenticate,
	validateRequest(notificationIdSchema),
	markReadController,
);

router.delete(
	"/:id",
	authenticate,
	validateRequest(notificationIdSchema),
	deleteNotificationController,
);

export const notificationRoutes = router;
