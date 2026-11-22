import { z } from "zod";
import { bdMobileNumberSchema } from "../payment/validation.js";

export const updateAdmissionFeeSchema = z.object({
	body: z.object({
		admissionFee: z
			.number()
			.positive("Admission fee must be greater than 0")
			.max(1000000, "Admission fee is too large"),
		bkashNumber: bdMobileNumberSchema.nullable().optional(),
		nagadNumber: bdMobileNumberSchema.nullable().optional(),
		rocketNumber: bdMobileNumberSchema.nullable().optional(),
	}),
});
