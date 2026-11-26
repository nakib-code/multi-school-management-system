import type { Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import {
	activateStudent,
	createStudent,
	deactivateStudent,
	getAllStudents,
	getMyStudentProfile,
	getStudentById,
	updateStudent,
} from "./service.js";

export const createStudentController = async (req: Request, res: Response) => {
	const schoolId = Number(req.params.schoolId);

	if (!schoolId || Number.isNaN(schoolId)) {
		throw new AppError(400, "Invalid school ID");
	}

	const result = await createStudent(schoolId, req.body);

	return sendResponse(res, {
		statusCode: 201,
		message: "Student created successfully",
		data: result,
	});
};

export const getMyStudentProfileController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}

	const schoolId = Number(req.params.schoolId);

	if (!schoolId || Number.isNaN(schoolId)) {
		throw new AppError(400, "Invalid school ID");
	}

	const result = await getMyStudentProfile(req.user.userId, schoolId);

	return sendResponse(res, {
		statusCode: 200,
		message: "Student profile retrieved successfully",
		data: result,
	});
};

export const getAllStudentsController = async (req: Request, res: Response) => {
	const schoolId = Number(req.params.schoolId);
	const page = Number(req.query.page) || 1;
	const limit = Number(req.query.limit) || 10;
	const search =
		typeof req.query.search === "string" ? req.query.search.trim() : undefined;

	const result = await getAllStudents(schoolId, page, limit, search);

	sendResponse(res, {
		statusCode: 200,
		message: "Students retrieved successfully",
		data: result,
	});
};

export const getStudentByIdController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const studentId = Number(req.params.id);

	const result = await getStudentById(
		schoolId,
		studentId,
		req.user
			? { userId: req.user.userId, role: req.user.role }
			: undefined,
	);

	sendResponse(res, {
		statusCode: 200,
		message: "Student retrieved successfully",
		data: result,
	});
};

export const updateStudentController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const studentId = Number(req.params.id);

	const result = await updateStudent(
		schoolId,
		studentId,
		req.body,
		req.user
			? { userId: req.user.userId, role: req.user.role }
			: undefined,
	);

	sendResponse(res, {
		statusCode: 200,
		message: "Student updated successfully",
		data: result,
	});
};

export const deactivateStudentController = async (
	req: Request,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const studentId = Number(req.params.id);

	const result = await deactivateStudent(schoolId, studentId);

	sendResponse(res, {
		statusCode: 200,
		message: "Student deactivated successfully",
		data: result,
	});
};

export const activateStudentController = async (
	req: Request,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const studentId = Number(req.params.id);

	const result = await activateStudent(schoolId, studentId);

	sendResponse(res, {
		statusCode: 200,
		message: "Student activated successfully",
		data: result,
	});
};
