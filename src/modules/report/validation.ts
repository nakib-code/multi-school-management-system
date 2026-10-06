import { z } from "zod";

export const reportOverviewQuerySchema = z.object({}).strict();

export type ReportOverviewQuery = z.infer<
  typeof reportOverviewQuerySchema
>;
