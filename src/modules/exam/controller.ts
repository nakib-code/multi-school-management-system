import type { NextFunction, Request, Response } from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { ExamFilterQuery } from "./interface.js";
import {
	createExam,
	deleteExam,
	getExamById,
	getExams,
	updateExam,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createExamController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createExam(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Exam created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getExamsController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: ExamFilterQuery }
			| undefined;
		const result = await getExams(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Exams retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getExamByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "exam ID");
		const result = await getExamById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Exam retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateExamController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "exam ID");
		const result = await updateExam(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Exam updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteExamController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "exam ID");
		const result = await deleteExam(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Exam deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
