import env from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import type { UpdatePlatformSettingInput } from "./interface.js";

export const getPlatformSetting = async () => {
	let setting = await prisma.platformSetting.findFirst({
		orderBy: { id: "asc" },
	});

	if (!setting) {
		setting = await prisma.platformSetting.create({
			data: {
				platformName: "MadrasaOS",
				bkashNumber: env.platform_bkash_number ?? null,
				bkashType: "PERSONAL",
				nagadNumber: env.platform_nagad_number ?? null,
				nagadType: "PERSONAL",
				rocketNumber: env.platform_rocket_number ?? null,
				rocketType: "PERSONAL",
				paymentInstruction:
					"Send the exact subscription amount via bKash, Nagad, or Rocket and submit your Sender Number and Transaction ID (TrxID) for verification.",
			},
		});
	}

	return setting;
};

export const updatePlatformSetting = async (
	input: UpdatePlatformSettingInput,
) => {
	const existing = await getPlatformSetting();

	return prisma.platformSetting.update({
		where: { id: existing.id },
		data: {
			...(input.platformName !== undefined && {
				platformName: input.platformName,
			}),
			...(input.supportPhone !== undefined && {
				supportPhone: input.supportPhone || null,
			}),
			...(input.bkashNumber !== undefined && {
				bkashNumber: input.bkashNumber || null,
			}),
			...(input.bkashType !== undefined && { bkashType: input.bkashType }),
			...(input.nagadNumber !== undefined && {
				nagadNumber: input.nagadNumber || null,
			}),
			...(input.nagadType !== undefined && { nagadType: input.nagadType }),
			...(input.rocketNumber !== undefined && {
				rocketNumber: input.rocketNumber || null,
			}),
			...(input.rocketType !== undefined && { rocketType: input.rocketType }),
			...(input.paymentInstruction !== undefined && {
				paymentInstruction: input.paymentInstruction || null,
			}),
		},
	});
};
