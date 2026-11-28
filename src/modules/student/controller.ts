import type { Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import { recordSchoolAudit } from "../audit-log/service.js";
import {
	activateStudent,
	createStudent,
	deactivateStudent,
	getAllStudents,
	getMyStudentProfile,
	getStudentById,
	resetStudentPassword,
	updateStudent,
} from "./service.js";

export const createStudentController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);

	if (!schoolId || Number.isNaN(schoolId)) {
		throw new AppError(400, "Invalid school ID");
	}

	const result = await createStudent(
		schoolId,
		req.body,
		req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
	);

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

export const getAllStudentsController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const page = Number(req.query.page) || 1;
	const limit = Number(req.query.limit) || 10;
	const search =
		typeof req.query.search === "string" ? req.query.search.trim() : undefined;

	const result = await getAllStudents(
		schoolId,
		page,
		limit,
		search,
		req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
	);

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
		req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
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
		req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
	);

	sendResponse(res, {
		statusCode: 200,
		message: "Student updated successfully",
		data: result,
	});
};

export const deactivateStudentController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const studentId = Number(req.params.id);

	const result = await deactivateStudent(schoolId, studentId);

	await recordSchoolAudit({
		schoolId,
		userId: req.user?.userId ?? null,
		action: "DELETE",
		entity: "Student",
		entityId: studentId,
		description: `Deactivated student #${studentId}`,
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

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

export const resetStudentPasswordController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const studentId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}
	if (!Number.isInteger(studentId) || studentId <= 0) {
		throw new AppError(400, "Invalid student ID");
	}

	const newPassword =
		typeof req.body?.newPassword === "string"
			? req.body.newPassword
			: undefined;

	const result = await resetStudentPassword(schoolId, studentId, newPassword);

	await recordSchoolAudit({
		schoolId,
		userId: req.user?.userId ?? null,
		action: "UPDATE",
		entity: "Student",
		entityId: studentId,
		description: `Reset portal password for student ${result.name}`,
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		message: "Student password reset successfully",
		data: result,
	});
};
