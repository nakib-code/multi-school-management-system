import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createNotificationController,
	deleteNotificationController,
	getNotificationsController,
	getUnreadCountController,
	markAllReadController,
	markReadController,
} from "./controller.js";
import {
	createNotificationSchema,
	getNotificationsQuerySchema,
	notificationIdSchema,
} from "./validation.js";

const router = Router();

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
	authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
	validateRequest(createNotificationSchema),
	createNotificationController,
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
