import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? undefined : val;

const emptyToNull = (val: unknown) =>
	typeof val === "string" && val.trim() === "" ? null : val;

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");

const idParam = z.coerce
	.number()
	.int()
	.positive("Diary ID must be a positive number");

export const classDiaryListQuerySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			classId: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive().optional(),
			),
			sectionId: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive().optional(),
			),
			subjectId: z.preprocess(
				emptyToUndefined,
				z.coerce.number().int().positive().optional(),
			),
			date: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
			fromDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
			toDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
		})
		.optional(),
});

export const classDiaryIdParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createClassDiarySchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		classId: z.coerce.number().int().positive("Class ID is required"),
		sectionId: z.preprocess(
			emptyToNull,
			z.coerce.number().int().positive().nullable().optional(),
		),
		subjectId: z.preprocess(
			emptyToNull,
			z.coerce.number().int().positive().nullable().optional(),
		),
		teacherId: z.preprocess(
			emptyToNull,
			z.coerce.number().int().positive().nullable().optional(),
		),
		diaryDate: z.coerce.date(),
		title: z.preprocess(
			emptyToNull,
			z.string().trim().max(200).nullable().optional(),
		),
		classwork: z
			.string()
			.trim()
			.min(2, "Classwork details are required")
			.max(4000),
		homework: z.preprocess(
			emptyToNull,
			z.string().trim().max(4000).nullable().optional(),
		),
		dueDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
		attachmentUrl: z.preprocess(
			emptyToNull,
			z.string().trim().url("Invalid attachment URL").nullable().optional(),
		),
	}),
});

export const updateClassDiarySchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
	body: z
		.object({
			classId: z.coerce.number().int().positive().optional(),
			sectionId: z.preprocess(
				emptyToNull,
				z.coerce.number().int().positive().nullable().optional(),
			),
			subjectId: z.preprocess(
				emptyToNull,
				z.coerce.number().int().positive().nullable().optional(),
			),
			diaryDate: z.coerce.date().optional(),
			title: z.preprocess(
				emptyToNull,
				z.string().trim().max(200).nullable().optional(),
			),
			classwork: z.string().trim().min(2).max(4000).optional(),
			homework: z.preprocess(
				emptyToNull,
				z.string().trim().max(4000).nullable().optional(),
			),
			dueDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
			attachmentUrl: z.preprocess(
				emptyToNull,
				z.string().trim().url("Invalid attachment URL").nullable().optional(),
			),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field is required",
		}),
});
