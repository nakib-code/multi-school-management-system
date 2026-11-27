import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordSchoolAudit } from "../audit-log/service.js";

import {
	getAdmissionFee,
	getSchoolFeatures,
	getSchoolPaymentMethods,
	getWebsiteConnection,
	rotateWebsiteConnectionKey,
	updateAdmissionFee,
	updateSchoolFeatures,
	updateSchoolPaymentMethods,
	updateWebsiteConnection,
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

	await recordSchoolAudit({
		schoolId,
		userId: req.user.userId,
		action: "UPDATE",
		entity: "SchoolSetting",
		entityId: schoolId,
		description: `Updated admission fee to ${result.admissionFee}`,
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

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
	if (req.user.role !== "SUPER_ADMIN" && req.user.schoolId !== schoolId) {
		throw new AppError(403, "You do not have access to this school");
	}
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

	await recordSchoolAudit({
		schoolId,
		userId: req.user.userId,
		action: "UPDATE",
		entity: "SchoolSetting",
		entityId: schoolId,
		description: "Updated school mobile banking payment methods",
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		message: "School payment methods updated successfully",
		data: result,
	});
};

// ======================================================
// EXTERNAL WEBSITE CONNECTION
// ======================================================

export const getWebsiteConnectionController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}
	const schoolId = resolveSchoolId(req);
	const result = await getWebsiteConnection(schoolId);
	return sendResponse(res, {
		statusCode: 200,
		message: "External website connection settings retrieved successfully",
		data: result,
	});
};

export const updateWebsiteConnectionController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}
	const schoolId = resolveSchoolId(req);
	const result = await updateWebsiteConnection(schoolId, req.body);

	await recordSchoolAudit({
		schoolId,
		userId: req.user.userId,
		action: "UPDATE",
		entity: "SchoolSetting",
		entityId: schoolId,
		description: "Updated external website URL / landing admin credentials",
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		message: "External website connection updated successfully",
		data: result,
	});
};

export const rotateWebsiteConnectionKeyController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) {
		throw new AppError(401, "Authentication required");
	}
	const schoolId = resolveSchoolId(req);
	const result = await rotateWebsiteConnectionKey(schoolId);

	await recordSchoolAudit({
		schoolId,
		userId: req.user.userId,
		action: "UPDATE",
		entity: "SchoolSetting",
		entityId: schoolId,
		description: "Generated/rotated external website connection key",
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		message: "Website connection key generated successfully",
		data: result,
	});
};
