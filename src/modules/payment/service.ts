import {
	getPlatformReceiverNumber,
	platformMobileBankingConfig,
} from "../../config/sslcommerz.js";
import type { ManualPaymentMethod, PaymentCallbackData } from "./interface.js";

export const normalizeTrxId = (trxId: string): string =>
	trxId.trim().toUpperCase();

export const getPlatformPaymentMethods = () => ({
	supportedMethods: ["BKASH", "NAGAD", "ROCKET"] as ManualPaymentMethod[],
	receiverNumbers: {
		BKASH: platformMobileBankingConfig.BKASH ?? null,
		NAGAD: platformMobileBankingConfig.NAGAD ?? null,
		ROCKET: platformMobileBankingConfig.ROCKET ?? null,
	},
});

export const resolvePlatformReceiverNumber = (
	method: ManualPaymentMethod,
	provided?: string,
): string | undefined => provided ?? getPlatformReceiverNumber(method);

export const getPaymentCallbackData = (
	body: Record<string, unknown>,
): PaymentCallbackData => {
	const data: PaymentCallbackData = {};

	if (typeof body.status === "string") data.status = body.status;
	if (typeof body.tran_id === "string") data.tran_id = body.tran_id;
	if (typeof body.val_id === "string") data.val_id = body.val_id;
	if (typeof body.amount === "string") data.amount = body.amount;
	if (typeof body.currency === "string") data.currency = body.currency;
	if (typeof body.value_a === "string") data.value_a = body.value_a;
	if (typeof body.value_b === "string") data.value_b = body.value_b;
	if (typeof body.value_c === "string") data.value_c = body.value_c;
	if (typeof body.value_d === "string") data.value_d = body.value_d;

	return data;
};
