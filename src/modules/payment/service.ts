import {
	getPlatformReceiverNumber,
	platformMobileBankingConfig,
} from "../../config/mobileBanking.js";
import { getPlatformSetting } from "../platformSetting/service.js";
import type { ManualPaymentMethod } from "./interface.js";

export const normalizeTrxId = (trxId: string): string =>
	trxId.trim().toUpperCase();

export const getPlatformPaymentMethods = async () => {
	const setting = await getPlatformSetting();

	return {
		platformName: setting.platformName,
		supportPhone: setting.supportPhone,
		supportedMethods: ["BKASH", "NAGAD", "ROCKET"] as ManualPaymentMethod[],
		receiverNumbers: {
			BKASH: setting.bkashNumber ?? platformMobileBankingConfig.BKASH ?? null,
			NAGAD: setting.nagadNumber ?? platformMobileBankingConfig.NAGAD ?? null,
			ROCKET:
				setting.rocketNumber ?? platformMobileBankingConfig.ROCKET ?? null,
		},
		accountTypes: {
			BKASH: setting.bkashType,
			NAGAD: setting.nagadType,
			ROCKET: setting.rocketType,
		},
		paymentInstruction: setting.paymentInstruction,
	};
};

export const resolvePlatformReceiverNumber = async (
	method: ManualPaymentMethod,
	provided?: string,
): Promise<string | undefined> => {
	if (provided) return provided;

	const setting = await getPlatformSetting();
	const fromDb =
		method === "BKASH"
			? setting.bkashNumber
			: method === "NAGAD"
				? setting.nagadNumber
				: setting.rocketNumber;

	return fromDb ?? getPlatformReceiverNumber(method);
};
