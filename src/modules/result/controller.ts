import type { NextFunction, Request, Response } from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { ResultFilterQuery } from "./interface.js";
import {
	createResult,
	deleteResult,
	getResultById,
	getResults,
	updateResult,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createResultController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createResult(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Result recorded successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getResultsController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: ResultFilterQuery }
			| undefined;
		const result = await getResults(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Results retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getResultByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "result ID");
		const result = await getResultById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Result retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateResultController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "result ID");
		const result = await updateResult(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Result updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteResultController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "result ID");
		const result = await deleteResult(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Result deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
