import type { NextFunction, Request, Response } from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { StudentFeeFilterQuery } from "./interface.js";
import {
	createStudentFee,
	deleteStudentFee,
	getStudentFeeById,
	getStudentFees,
	updateStudentFee,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createStudentFeeController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createStudentFee(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Student fee created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentFeesController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: StudentFeeFilterQuery }
			| undefined;
		const result = await getStudentFees(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fees retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentFeeByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student fee ID");
		const result = await getStudentFeeById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fee retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateStudentFeeController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student fee ID");
		const result = await updateStudentFee(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fee updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteStudentFeeController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student fee ID");
		const result = await deleteStudentFee(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fee deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
