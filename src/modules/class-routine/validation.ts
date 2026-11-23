import { z } from "zod";
import { DayOfWeek } from "../../generated/prisma/client.js";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const routineSchoolParamsSchema = z.object({
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
	}),
	query: z
		.object({
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.coerce.number().int().positive().optional(),
			teacherId: z.coerce.number().int().positive().optional(),
			dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
			academicYear: z.string().trim().max(30).optional(),
		})
		.optional(),
});

export const routineIdParamsSchema = z.object({
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
		id: z.coerce.number().int().positive("Invalid routine ID"),
	}),
});

export const createRoutineSchema = z.object({
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
	}),
	body: z
		.object({
			classId: z.coerce.number().int().positive(),
			sectionId: z.coerce.number().int().positive().optional().nullable(),
			subjectId: z.coerce.number().int().positive(),
			teacherId: z.coerce.number().int().positive(),
			dayOfWeek: z.nativeEnum(DayOfWeek),
			startTime: z.string().regex(timeRegex, "startTime must be HH:mm (24h)"),
			endTime: z.string().regex(timeRegex, "endTime must be HH:mm (24h)"),
			roomNumber: z.string().trim().max(50).optional().nullable(),
			academicYear: z.string().trim().min(1).max(30),
		})
		.refine((d) => d.startTime < d.endTime, {
			message: "endTime must be after startTime",
			path: ["endTime"],
		}),
});

export const updateRoutineSchema = z.object({
	params: z.object({
		schoolId: z.coerce.number().int().positive("Invalid school ID"),
		id: z.coerce.number().int().positive("Invalid routine ID"),
	}),
	body: z.object({
		classId: z.coerce.number().int().positive().optional(),
		sectionId: z.coerce.number().int().positive().optional().nullable(),
		subjectId: z.coerce.number().int().positive().optional(),
		teacherId: z.coerce.number().int().positive().optional(),
		dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
		startTime: z
			.string()
			.regex(timeRegex, "startTime must be HH:mm (24h)")
			.optional(),
		endTime: z
			.string()
			.regex(timeRegex, "endTime must be HH:mm (24h)")
			.optional(),
		roomNumber: z.string().trim().max(50).optional().nullable(),
		academicYear: z.string().trim().min(1).max(30).optional(),
		isActive: z.boolean().optional(),
	}),
});
