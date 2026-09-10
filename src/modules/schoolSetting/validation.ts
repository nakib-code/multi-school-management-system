import { z } from "zod";

export const updateAdmissionFeeSchema = z.object({
  body: z.object({
    admissionFee: z
      .number()
      .positive("Admission fee must be greater than 0")
      .max(1000000, "Admission fee is too large"),
  }),
});