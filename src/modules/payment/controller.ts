import type { Request, Response } from "express";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { getPaymentCallbackData, validatePayment } from "./service.js";

// ----------------------------------------------------
// SSLCommerz Success Callback
// ----------------------------------------------------

export const paymentSuccessController = async (req: Request, res: Response) => {
	const callbackData = getPaymentCallbackData(req.body);

	if (!callbackData.val_id) {
		throw new AppError(400, "SSLCommerz validation ID is missing");
	}

	const validation = await validatePayment(callbackData.val_id);

	if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
		throw new AppError(400, "SSLCommerz payment validation failed");
	}

	return sendResponse(res, {
		statusCode: 200,
		message: "Payment validated successfully",
		data: {
			status: validation.status,
			transactionId: validation.tran_id,
			validationId: validation.val_id,
			amount: validation.amount ? Number(validation.amount) : null,
			currency: validation.currency,
		},
	});
};

// ----------------------------------------------------
// SSLCommerz Fail Callback
// ----------------------------------------------------

export const paymentFailController = async (req: Request, res: Response) => {
	const callbackData = getPaymentCallbackData(req.body);

	return sendResponse(res, {
		statusCode: 200,
		message: "Payment failed",
		data: {
			status: "FAILED",
			transactionId: callbackData.tran_id || null,
		},
	});
};

// ----------------------------------------------------
// SSLCommerz Cancel Callback
// ----------------------------------------------------

export const paymentCancelController = async (req: Request, res: Response) => {
	const callbackData = getPaymentCallbackData(req.body);

	return sendResponse(res, {
		statusCode: 200,
		message: "Payment cancelled",
		data: {
			status: "CANCELLED",
			transactionId: callbackData.tran_id || null,
		},
	});
};

// ----------------------------------------------------
// SSLCommerz IPN
// ----------------------------------------------------

export const paymentIpnController = async (req: Request, res: Response) => {
	const callbackData = getPaymentCallbackData(req.body);

	if (!callbackData.val_id) {
		throw new AppError(400, "SSLCommerz validation ID is missing");
	}

	const validation = await validatePayment(callbackData.val_id);

	if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
		throw new AppError(400, "SSLCommerz payment validation failed");
	}

	return sendResponse(res, {
		statusCode: 200,
		message: "IPN received and payment validated successfully",
		data: {
			status: validation.status,
			transactionId: validation.tran_id,
			validationId: validation.val_id,
			amount: validation.amount ? Number(validation.amount) : null,
			currency: validation.currency,
		},
	});
};
