import { z } from "zod";
import { NotificationType } from "../../generated/prisma/client.js";

export const createNotificationSchema = z.object({
	body: z.object({
		recipientIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
		title: z.string().trim().min(2).max(150),
		message: z.string().trim().min(2).max(1000),
		type: z.nativeEnum(NotificationType).optional().default("ANNOUNCEMENT"),
		metadata: z.record(z.string(), z.unknown()).optional(),
	}),
});

export const getNotificationsQuerySchema = z.object({
	query: z.object({
		page: z.coerce.number().int().min(1).optional().default(1),
		limit: z.coerce.number().int().min(1).max(50).optional().default(15),
		isRead: z
			.enum(["true", "false"])
			.transform((v) => v === "true")
			.optional(),
		type: z.nativeEnum(NotificationType).optional(),
	}),
});

export const notificationIdSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid notification ID"),
	}),
});
