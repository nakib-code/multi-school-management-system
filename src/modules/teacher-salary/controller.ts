import type { NextFunction, Request, Response } from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { TeacherSalaryFilterQuery } from "./interface.js";
import {
	createTeacherSalary,
	deleteTeacherSalary,
	getTeacherSalaries,
	getTeacherSalaryById,
	updateTeacherSalary,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createTeacherSalaryController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createTeacherSalary(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Teacher salary created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getTeacherSalariesController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: TeacherSalaryFilterQuery }
			| undefined;
		const result = await getTeacherSalaries(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher salaries retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getTeacherSalaryByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "teacher salary ID");
		const result = await getTeacherSalaryById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher salary retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateTeacherSalaryController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "teacher salary ID");
		const result = await updateTeacherSalary(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher salary updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteTeacherSalaryController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "teacher salary ID");
		const result = await deleteTeacherSalary(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher salary deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
