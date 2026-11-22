import type { NextFunction, Request, Response } from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { EnrollmentFilterQuery } from "./interface.js";
import {
	createEnrollment,
	deleteEnrollment,
	getEnrollmentById,
	getEnrollments,
	updateEnrollment,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createEnrollmentController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createEnrollment(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Enrollment created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getEnrollmentsController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: EnrollmentFilterQuery }
			| undefined;
		const result = await getEnrollments(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Enrollments retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getEnrollmentByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "enrollment ID");
		const result = await getEnrollmentById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Enrollment retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateEnrollmentController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "enrollment ID");
		const result = await updateEnrollment(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Enrollment updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteEnrollmentController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "enrollment ID");
		const result = await deleteEnrollment(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Enrollment deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
