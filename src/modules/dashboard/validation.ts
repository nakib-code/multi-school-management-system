import { z } from "zod";

export const dashboardQuerySchema = z.object({
	query: z
		.object({
			academicYear: z.string().trim().min(1).max(30).optional(),
		})
		.optional(),
});
