import type { NextFunction, Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import { resolveScopedTeacherId } from "../../utils/ownershipScope.js";
import sendResponse from "../../utils/sendResponse.js";
import type { TeacherAssignmentFilterQuery } from "./interface.js";
import {
	createTeacherAssignment,
	deleteTeacherAssignment,
	getTeacherAssignmentById,
	getTeacherAssignments,
	updateTeacherAssignment,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createTeacherAssignmentController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createTeacherAssignment(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Teacher assignment created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getTeacherAssignmentsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: TeacherAssignmentFilterQuery }
			| undefined;
		const query: TeacherAssignmentFilterQuery = { ...(validated?.query ?? {}) };

		if (req.user) {
			const scopedTeacherId = await resolveScopedTeacherId(schoolId, req.user);
			if (scopedTeacherId !== null) {
				if (scopedTeacherId < 0) {
					return sendResponse(res, {
						statusCode: 200,
						message: "Teacher assignments retrieved successfully",
						data: [],
					});
				}
				query.teacherId = scopedTeacherId;
			}
		}

		const result = await getTeacherAssignments(schoolId, query);
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher assignments retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getTeacherAssignmentByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "assignment ID");
		const result = await getTeacherAssignmentById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher assignment retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateTeacherAssignmentController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "assignment ID");
		const result = await updateTeacherAssignment(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher assignment updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteTeacherAssignmentController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "assignment ID");
		const result = await deleteTeacherAssignment(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Teacher assignment deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
