import env from "./env.js";

export type ManualMobilePaymentMethod = "BKASH" | "NAGAD" | "ROCKET";

export const platformMobileBankingConfig: Record<
	ManualMobilePaymentMethod,
	string | undefined
> = {
	BKASH: env.platform_bkash_number,
	NAGAD: env.platform_nagad_number,
	ROCKET: env.platform_rocket_number,
};

export const getPlatformReceiverNumber = (
	method: ManualMobilePaymentMethod,
): string | undefined => platformMobileBankingConfig[method];
