import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import { createTeacher, verifyTeacherEmail } from "./service.js";

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
