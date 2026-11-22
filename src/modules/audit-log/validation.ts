import { z } from "zod";
import { AuditAction } from "../../generated/prisma/client.js";

const schoolIdParam = z.coerce
	.number()
	.int()
	.positive("School ID must be a positive number");
const idParam = z.coerce
	.number()
	.int()
	.positive("Audit log ID must be a positive number");

export const auditLogSchoolParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	query: z
		.object({
			action: z.nativeEnum(AuditAction).optional(),
			entity: z.string().trim().min(1).max(100).optional(),
			userId: z.coerce.number().int().positive().optional(),
			fromDate: z.coerce.date().optional(),
			toDate: z.coerce.date().optional(),
			page: z.coerce.number().int().positive().optional(),
			limit: z.coerce.number().int().positive().max(100).optional(),
		})
		.optional(),
});

export const auditLogParamsSchema = z.object({
	params: z.object({ schoolId: schoolIdParam, id: idParam }),
});

export const createAuditLogSchema = z.object({
	params: z.object({ schoolId: schoolIdParam }),
	body: z.object({
		action: z.nativeEnum(AuditAction),
		entity: z.string().trim().min(1, "Entity is required").max(100),
		entityId: z.coerce.number().int().positive().optional(),
		description: z.string().trim().max(1000).optional(),
	}),
});
