import type { NextFunction, Request, Response } from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import {
	createSubject,
	deleteSubject,
	getActiveSubjects,
	getSubjectById,
	getSubjects,
	toggleSubjectStatus,
	updateSubject,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createSubjectController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createSubject(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Subject created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getSubjectsController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await getSubjects(schoolId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Subjects retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getActiveSubjectsController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await getActiveSubjects(schoolId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Active subjects retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getSubjectByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "subject ID");
		const result = await getSubjectById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Subject retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateSubjectController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "subject ID");
		const result = await updateSubject(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Subject updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const toggleSubjectStatusController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "subject ID");
		const result = await toggleSubjectStatus(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: `Subject ${result.isActive ? "activated" : "deactivated"} successfully`,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteSubjectController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "subject ID");
		const result = await deleteSubject(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Subject deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
