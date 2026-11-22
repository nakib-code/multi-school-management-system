import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { StudentPaymentFilterQuery } from "./interface.js";
import {
	getStudentPaymentById,
	getStudentPayments,
	rejectStudentPayment,
	submitStudentPayment,
	verifyStudentPayment,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const submitStudentPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await submitStudentPayment(
			schoolId,
			{ userId: req.user.userId, role: req.user.role },
			req.body,
		);
		return sendResponse(res, {
			statusCode: 201,
			message: "Manual student payment submitted and pending verification",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentPaymentsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: StudentPaymentFilterQuery }
			| undefined;
		const result = await getStudentPayments(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payments retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentPaymentByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student payment ID");
		const result = await getStudentPaymentById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payment retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const verifyStudentPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student payment ID");
		const result = await verifyStudentPayment(schoolId, id, req.user.userId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payment verified successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const rejectStudentPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student payment ID");
		const result = await rejectStudentPayment(
			schoolId,
			id,
			req.user.userId,
			req.body,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payment rejected successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
