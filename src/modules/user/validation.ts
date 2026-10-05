import { z } from "zod";
import { UserRole, UserStatus } from "../../generated/prisma/client.js";

export const getUsersQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional().default(1),

	limit: z.coerce.number().int().min(1).max(100).optional().default(10),

	search: z.string().trim().optional(),

	role: z.nativeEnum(UserRole).optional(),

	status: z.nativeEnum(UserStatus).optional(),

	schoolId: z.coerce.number().int().positive().optional(),
});

export const updateUserStatusSchema = z.object({
	status: z.enum(["ACTIVE", "INACTIVE"]),
});
