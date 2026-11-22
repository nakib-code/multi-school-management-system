import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { SalaryPaymentFilterQuery } from "./interface.js";
import {
	createSalaryPayment,
	getSalaryPaymentById,
	getSalaryPayments,
	updateSalaryPayment,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createSalaryPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createSalaryPayment(
			schoolId,
			req.user.userId,
			req.body,
		);
		return sendResponse(res, {
			statusCode: 201,
			message: "Salary payment recorded successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getSalaryPaymentsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: SalaryPaymentFilterQuery }
			| undefined;
		const result = await getSalaryPayments(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Salary payments retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getSalaryPaymentByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "salary payment ID");
		const result = await getSalaryPaymentById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Salary payment retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateSalaryPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "salary payment ID");
		const result = await updateSalaryPayment(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Salary payment updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
