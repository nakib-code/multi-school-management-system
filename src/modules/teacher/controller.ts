import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import {
	createTeacher,
	deactivateTeacher,
	getTeacherById,
	getTeachers,
	updateTeacher,
	verifyTeacherEmail,
} from "./service.js";

export const createTeacherController = async (
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

	const result = await createTeacher({
		schoolId,
		...req.body,
	});

	return sendResponse(res, {
		statusCode: 201,
		message: "Teacher created successfully",
		data: result,
	});
};

export const verifyTeacherEmailController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}

	const schoolId = Number(req.params.schoolId);
	const teacherId = Number(req.params.id);

	if (!schoolId || Number.isNaN(schoolId)) {
		throw new AppError(400, "Invalid school ID");
	}

	if (!teacherId || Number.isNaN(teacherId)) {
		throw new AppError(400, "Invalid teacher ID");
	}

	const { code } = req.body;

	const result = await verifyTeacherEmail(schoolId, teacherId, code);

	return sendResponse(res, {
		statusCode: 200,
		message: "Teacher email verified successfully",
		data: result,
	});
};

export const getTeachersController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	if (!schoolId || Number.isNaN(schoolId)) {
		throw new AppError(400, "Invalid school ID");
	}
	const search =
		typeof req.query.search === "string" ? req.query.search : undefined;
	const teachers = await getTeachers(
		schoolId,
		search !== undefined ? { search } : undefined,
	);
	return sendResponse(res, {
		statusCode: 200,
		message: "Teachers retrieved successfully",
		data: teachers,
	});
};

export const getTeacherByIdController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const teacherId = Number(req.params.id);
	if (!schoolId || Number.isNaN(schoolId) || !teacherId || Number.isNaN(teacherId)) {
		throw new AppError(400, "Invalid school or teacher ID");
	}
	const teacher = await getTeacherById(schoolId, teacherId);
	return sendResponse(res, {
		statusCode: 200,
		message: "Teacher retrieved successfully",
		data: teacher,
	});
};

export const updateTeacherController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const teacherId = Number(req.params.id);
	if (!schoolId || Number.isNaN(schoolId) || !teacherId || Number.isNaN(teacherId)) {
		throw new AppError(400, "Invalid school or teacher ID");
	}
	const teacher = await updateTeacher(schoolId, teacherId, req.body);
	return sendResponse(res, {
		statusCode: 200,
		message: "Teacher updated successfully",
		data: teacher,
	});
};

export const deactivateTeacherController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const teacherId = Number(req.params.id);
	if (!schoolId || Number.isNaN(schoolId) || !teacherId || Number.isNaN(teacherId)) {
		throw new AppError(400, "Invalid school or teacher ID");
	}
	const teacher = await deactivateTeacher(schoolId, teacherId);
	return sendResponse(res, {
		statusCode: 200,
		message: "Teacher deactivated successfully",
		data: teacher,
	});
};
