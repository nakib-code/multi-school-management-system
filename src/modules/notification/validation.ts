import { z } from "zod";
import { NotificationType } from "../../generated/prisma/client.js";

const emptyToUndefined = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? undefined : val;

export const createNotificationSchema = z.object({
	body: z.object({
		recipientIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
		title: z.string().trim().min(2).max(150),
		message: z.string().trim().min(2).max(1000),
		type: z.nativeEnum(NotificationType).optional().default("ANNOUNCEMENT"),
		metadata: z.record(z.string(), z.unknown()).optional(),
	}),
});

export const broadcastNotificationSchema = z.object({
	body: z.object({
		schoolId: z.preprocess(
			emptyToUndefined,
			z.coerce.number().int().positive().optional(),
		),
		title: z.string().trim().min(2, "Title is required").max(150),
		message: z.string().trim().min(2, "Message is required").max(2000),
		type: z.enum(["ANNOUNCEMENT", "EMERGENCY"]).default("ANNOUNCEMENT"),
		audience: z.enum(["ALL", "TEACHERS", "GUARDIANS", "STUDENTS", "CLASS"]),
		classId: z.preprocess(
			emptyToUndefined,
			z.coerce.number().int().positive().optional(),
		),
		sectionId: z.preprocess(
			emptyToUndefined,
			z.coerce.number().int().positive().optional(),
		),
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
