import { sslcommerz } from "../../config/sslcommerz.js";
import AppError from "../../utils/appError.js";

import type {
	InitiatePaymentInput,
	InitiatePaymentResult,
	PaymentCallbackData,
	SSLCommerzValidationResponse,
} from "./interface.js";

// ----------------------------------------------------
// Initiate SSLCommerz Payment
// ----------------------------------------------------

export const initiatePayment = async (
	input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> => {
	const response = await sslcommerz.init({
		total_amount: input.amount,
		currency: "BDT",
		tran_id: input.transactionId,

		success_url: input.successUrl,
		fail_url: input.failUrl,
		cancel_url: input.cancelUrl,
		ipn_url: input.ipnUrl,

		product_name: input.productName,
		product_category: input.productCategory,
		product_profile: "general",

		cus_name: input.customerName,
		cus_email: input.customerEmail,
		cus_phone: input.customerPhone || "N/A",

		cus_add1: input.customerAddress || "N/A",
		cus_city: input.customerCity || "Dhaka",
		cus_country: input.customerCountry || "Bangladesh",

		shipping_method: "NO",
		num_of_item: 1,

		value_a: input.valueA,
		value_b: input.valueB,
		value_c: input.valueC,
		value_d: input.valueD,
	});

	console.log("SSLCommerz init response:", JSON.stringify(response, null, 2));

	const gatewayResponse = response as {
		GatewayPageURL?: string;
		status?: string;
	};

	if (gatewayResponse.status && gatewayResponse.status !== "SUCCESS") {
		throw new AppError(502, "Failed to initialize SSLCommerz payment");
	}

	if (!gatewayResponse.GatewayPageURL) {
		throw new AppError(502, "SSLCommerz payment gateway URL was not returned");
	}

	return {
		transactionId: input.transactionId,
		amount: input.amount,
		paymentUrl: gatewayResponse.GatewayPageURL,
	};
};

// ----------------------------------------------------
// Validate SSLCommerz Payment
// ----------------------------------------------------

export const validatePayment = async (
	valId: string,
): Promise<SSLCommerzValidationResponse> => {
	if (!valId) {
		throw new AppError(400, "SSLCommerz validation ID is required");
	}

	const response = await sslcommerz.validate({
		val_id: valId,
	});

	const validationResponse = response as SSLCommerzValidationResponse;

	if (!validationResponse.val_id) {
		throw new AppError(400, "SSLCommerz payment validation failed");
	}

	return validationResponse;
};

// ----------------------------------------------------
// Extract callback data
// ----------------------------------------------------

export const getPaymentCallbackData = (
	body: PaymentCallbackData,
): PaymentCallbackData => {
	return {
		...(body.status !== undefined ? { status: body.status } : {}),

		...(body.tran_id !== undefined ? { tran_id: body.tran_id } : {}),

		...(body.val_id !== undefined ? { val_id: body.val_id } : {}),

		...(body.amount !== undefined ? { amount: body.amount } : {}),

		...(body.currency !== undefined ? { currency: body.currency } : {}),

		...(body.value_a !== undefined ? { value_a: body.value_a } : {}),

		...(body.value_b !== undefined ? { value_b: body.value_b } : {}),

		...(body.value_c !== undefined ? { value_c: body.value_c } : {}),

		...(body.value_d !== undefined ? { value_d: body.value_d } : {}),
	};
};
