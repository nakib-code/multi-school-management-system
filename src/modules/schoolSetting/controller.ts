import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import { getAdmissionFee, updateAdmissionFee } from "./service.js";

// ======================================================
// GET ADMISSION FEE
// ======================================================

export const getAdmissionFeeController = async (
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

	const result = await getAdmissionFee(schoolId);

	return sendResponse(res, {
		statusCode: 200,
		message: "Admission fee retrieved successfully",
		data: result,
	});
};

// ======================================================
// UPDATE ADMISSION FEE
// ======================================================

export const updateAdmissionFeeController = async (
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

	const result = await updateAdmissionFee(schoolId, req.body);

	return sendResponse(res, {
		statusCode: 200,
		message: "Admission fee updated successfully",
		data: result,
	});
};
