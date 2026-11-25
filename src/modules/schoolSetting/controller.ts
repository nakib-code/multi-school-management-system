import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import {
	getAdmissionFee,
	getSchoolFeatures,
	getSchoolPaymentMethods,
	updateAdmissionFee,
	updateSchoolFeatures,
	updateSchoolPaymentMethods,
} from "./service.js";

const resolveSchoolId = (req: AuthRequest): number => {
	const raw = req.params.schoolId ?? req.user?.schoolId;
	const schoolId = Number(raw);
	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}
	return schoolId;
};

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

	const schoolId = resolveSchoolId(req);
	const result = await getAdmissionFee(schoolId);

	return sendResponse(res, {
		statusCode: 200,
		message: "School settings retrieved successfully",
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

	const schoolId = resolveSchoolId(req);
	const result = await updateAdmissionFee(schoolId, req.body);

	return sendResponse(res, {
		statusCode: 200,
		message: "Admission fee updated successfully",
		data: result,
	});
};

// ======================================================
// GET SCHOOL FEATURES
// ======================================================

export const getSchoolFeaturesController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}

	const schoolId = resolveSchoolId(req);
	const result = await getSchoolFeatures(schoolId);

	return sendResponse(res, {
		statusCode: 200,
		message: "School feature flags retrieved successfully",
		data: result,
	});
};

// ======================================================
// UPDATE SCHOOL FEATURES (SUPER ADMIN)
// ======================================================

export const updateSchoolFeaturesController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}

	const schoolId = resolveSchoolId(req);
	const result = await updateSchoolFeatures(schoolId, req.body);

	return sendResponse(res, {
		statusCode: 200,
		message: "School feature flags updated successfully",
		data: result,
	});
};

// ======================================================
// GET SCHOOL PAYMENT METHODS
// ======================================================

export const getSchoolPaymentMethodsController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}

	const schoolId = resolveSchoolId(req);
	const result = await getSchoolPaymentMethods(schoolId);

	return sendResponse(res, {
		statusCode: 200,
		message: "School payment methods retrieved successfully",
		data: result,
	});
};

// ======================================================
// UPDATE SCHOOL PAYMENT METHODS (ADMIN / MANAGER)
// ======================================================

export const updateSchoolPaymentMethodsController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}

	const schoolId = resolveSchoolId(req);
	const result = await updateSchoolPaymentMethods(schoolId, req.body);

	return sendResponse(res, {
		statusCode: 200,
		message: "School payment methods updated successfully",
		data: result,
	});
};
