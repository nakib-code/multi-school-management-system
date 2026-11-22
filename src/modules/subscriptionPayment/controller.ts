import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { SubscriptionPaymentFilterQuery } from "./interface.js";
import {
	getPendingSubscriptionPayments,
	getSubscriptionPaymentHistory,
	getSubscriptionPaymentSummary,
	rejectSubscriptionPayment,
	submitManualSubscriptionPayment,
	verifySubscriptionPayment,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const submitManualSubscriptionPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user?.schoolId) {
			throw new AppError(403, "School information is missing");
		}
		const subscriptionId = parsePositiveInt(
			req.params.subscriptionId,
			"subscription ID",
		);

		const result = await submitManualSubscriptionPayment(
			subscriptionId,
			req.user.schoolId,
			req.body,
		);

		return sendResponse(res, {
			statusCode: 201,
			message:
				"Manual subscription payment submitted and pending Super Admin verification",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getPendingSubscriptionPaymentsController = async (
	_req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await getPendingSubscriptionPayments();
		return sendResponse(res, {
			statusCode: 200,
			message: "Pending subscription payments retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const verifySubscriptionPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const paymentId = parsePositiveInt(req.params.paymentId, "payment ID");
		const result = await verifySubscriptionPayment(paymentId, req.user.userId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Subscription payment verified and subscription activated",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const rejectSubscriptionPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const paymentId = parsePositiveInt(req.params.paymentId, "payment ID");
		const result = await rejectSubscriptionPayment(
			paymentId,
			req.user.userId,
			req.body,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Subscription payment rejected successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getSubscriptionPaymentSummaryController = async (
	_req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await getSubscriptionPaymentSummary();
		return sendResponse(res, {
			statusCode: 200,
			message: "Subscription payment summary retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getSubscriptionPaymentHistoryController = async (
	_req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const validated = res.locals.validatedRequest as
			| { query?: SubscriptionPaymentFilterQuery }
			| undefined;
		const result = await getSubscriptionPaymentHistory(validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Subscription payment history retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
