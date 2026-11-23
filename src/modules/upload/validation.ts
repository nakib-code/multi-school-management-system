import { z } from "zod";

export const UPLOAD_CATEGORIES = [
	"SCHOOL_LOGO",
	"SCHOOL_PROFILE",
	"USER_AVATAR",
	"STUDENT_PHOTO",
	"TEACHER_PHOTO",
	"GUARDIAN_PHOTO",
	"DOCUMENT",
] as const;

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

export const uploadFileSchema = z.object({
	body: z.object({
		dataUrl: z
			.string()
			.min(20, "File data is required")
			.refine(
				(val) => val.startsWith("data:") && val.includes(";base64,"),
				"File must be a valid base64 data URL",
			),
		category: z.enum(UPLOAD_CATEGORIES).default("USER_AVATAR"),
		fileName: z.string().trim().max(150).optional(),
	}),
});

export const uploadIdParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid file ID"),
	}),
});
