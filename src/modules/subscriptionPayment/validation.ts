import { z } from "zod";

export const subscriptionIdParamsSchema = z.object({
  params: z.object({
    subscriptionId: z.coerce
      .number()
      .int()
      .positive("Invalid subscription ID"),
  }),
});