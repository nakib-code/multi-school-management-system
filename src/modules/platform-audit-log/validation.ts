import { z } from "zod";
import { AuditAction } from "../../generated/prisma/client.js";

export const getPlatformAuditLogsQuerySchema = z.object({
	query: z.object({
		page: z.coerce.number().int().min(1).optional().default(1),
		limit: z.coerce.number().int().min(1).max(100).optional().default(20),
		search: z.string().trim().max(100).optional(),
		action: z.nativeEnum(AuditAction).optional(),
		entityType: z.string().trim().max(100).optional(),
		schoolId: z.coerce.number().int().positive().optional(),
		actorId: z.coerce.number().int().positive().optional(),
		fromDate: z.string().optional(),
		toDate: z.string().optional(),
	}),
});

export const platformAuditLogIdSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid audit log ID"),
	}),
});
