import type { Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordSchoolAudit } from "../audit-log/service.js";
import {
	approveAdmission,
	confirmCashPayment,
	createAdmission,
	createPublicAdmissionBySlug,
	getAdmissionById,
	getAdmissions,
	initiateOnlinePayment,
	rejectAdmission,
	rejectOnlineAdmissionPayment,
	submitOnlinePaymentTrx,
	trackAdmission,
	verifyOnlineAdmissionPayment,
	verifyStudentEmail,
} from "./service.js";

// ==================================================
// Create Admission
// ==================================================

export const createAdmissionController = async (
	req: Request,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}

	const result = await createAdmission({
		...req.body,
		schoolId,
	});

	return sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Admission application created successfully",
		data: result,
	});
};

export const createPublicSlugAdmissionController = async (
	req: Request,
	res: Response,
) => {
	const slug = String(req.params.slug ?? "").trim();

	if (!slug) {
		throw new AppError(400, "Invalid school slug");
	}

	const result = await createPublicAdmissionBySlug(slug, req.body);

	return sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Admission application created successfully",
		data: result,
	});
};

// ==================================================
// Verify Student Email
// ==================================================

export const verifyStudentEmailController = async (
	req: Request,
	res: Response,
) => {
	const result = await verifyStudentEmail(req.body);

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Student email verified successfully",
		data: result,
	});
};

// ==================================================
// Get Admissions
// ==================================================

export const getAdmissionsController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}

	const query = {
		...(req.query.page ? { page: Number(req.query.page) } : {}),

		...(req.query.limit ? { limit: Number(req.query.limit) } : {}),

		...(typeof req.query.search === "string"
			? { search: req.query.search }
			: {}),

		...(req.query.classId ? { classId: Number(req.query.classId) } : {}),

		...(typeof req.query.academicYear === "string" &&
		req.query.academicYear.trim()
			? { academicYear: req.query.academicYear.trim() }
			: {}),

		...(typeof req.query.status === "string"
			? { status: req.query.status }
			: {}),

		...(typeof req.query.paymentStatus === "string"
			? { paymentStatus: req.query.paymentStatus }
			: {}),
	};

	const result = await getAdmissions(schoolId, query);

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Admissions fetched successfully",
		data: result,
	});
};
// ==================================================
// Get Admission By ID
// ==================================================

export const getAdmissionByIdController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const admissionId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}

	if (!Number.isInteger(admissionId) || admissionId <= 0) {
		throw new AppError(400, "Invalid admission ID");
	}

	const result = await getAdmissionById(schoolId, admissionId);

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Admission fetched successfully",
		data: result,
	});
};

// ==================================================
// Approve Admission
// ==================================================

export const approveAdmissionController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const admissionId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}

	if (!Number.isInteger(admissionId) || admissionId <= 0) {
		throw new AppError(400, "Invalid admission ID");
	}

	if (!req.user?.userId) {
		throw new AppError(401, "Unauthorized");
	}

	const result = await approveAdmission(schoolId, admissionId, req.user.userId);

	await recordSchoolAudit({
		schoolId,
		userId: req.user.userId,
		action: "APPROVE",
		entity: "Admission",
		entityId: admissionId,
		description: `Approved admission ${result.applicationNo} (${result.studentName})`,
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Admission approved successfully",
		data: result,
	});
};

// ==================================================
// Reject Admission
// ==================================================

export const rejectAdmissionController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const admissionId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}

	if (!Number.isInteger(admissionId) || admissionId <= 0) {
		throw new AppError(400, "Invalid admission ID");
	}

	if (!req.user?.userId) {
		throw new AppError(401, "Unauthorized");
	}

	const result = await rejectAdmission(
		schoolId,
		admissionId,
		req.user.userId,
		req.body.rejectionReason,
	);

	await recordSchoolAudit({
		schoolId,
		userId: req.user.userId,
		action: "REJECT",
		entity: "Admission",
		entityId: admissionId,
		description: `Rejected admission ${result.applicationNo}: ${req.body.rejectionReason}`,
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Admission rejected successfully",
		data: result,
	});
};

// ==================================================
// Confirm Cash Payment
// ==================================================

export const confirmCashPaymentController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const admissionId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}

	if (!Number.isInteger(admissionId) || admissionId <= 0) {
		throw new AppError(400, "Invalid admission ID");
	}

	if (!req.user?.userId) {
		throw new AppError(401, "Unauthorized");
	}

	const result = await confirmCashPayment(
		schoolId,
		admissionId,
		req.user.userId,
		{ remarks: req.body?.remarks },
	);

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Cash payment confirmed successfully",
		data: result,
	});
};

// ==================================================
// Initiate Online Payment
// ==================================================

export const initiateOnlinePaymentController = async (
	req: Request,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const admissionId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}

	if (!Number.isInteger(admissionId) || admissionId <= 0) {
		throw new AppError(400, "Invalid admission ID");
	}

	const result = await initiateOnlinePayment(schoolId, admissionId, {
		applicationNo: String(req.body.applicationNo ?? ""),
		...(req.body.guardianPhone
			? { guardianPhone: String(req.body.guardianPhone) }
			: {}),
		...(req.body.studentEmail
			? { studentEmail: String(req.body.studentEmail) }
			: {}),
	});

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Online payment initiated successfully",
		data: result,
	});
};

// ==================================================
// Track Admission
// ==================================================

export const trackAdmissionController = async (req: Request, res: Response) => {
	const result = await trackAdmission({
		applicationNo: String(req.body.applicationNo ?? ""),
		...(req.body.schoolId !== undefined
			? { schoolId: Number(req.body.schoolId) }
			: {}),
		...(req.body.guardianPhone
			? { guardianPhone: String(req.body.guardianPhone) }
			: {}),
		...(req.body.studentEmail
			? { studentEmail: String(req.body.studentEmail) }
			: {}),
	});

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Admission application fetched successfully",
		data: result,
	});
};

// ==================================================
// Submit Online Payment TrxID (Public Tracking)
// ==================================================

export const submitOnlinePaymentTrxController = async (
	req: Request,
	res: Response,
) => {
	const result = await submitOnlinePaymentTrx({
		applicationNo: String(req.body.applicationNo ?? ""),
		...(req.body.schoolId !== undefined
			? { schoolId: Number(req.body.schoolId) }
			: {}),
		guardianPhone: req.body.guardianPhone
			? String(req.body.guardianPhone)
			: undefined,
		studentEmail: req.body.studentEmail
			? String(req.body.studentEmail)
			: undefined,
		paymentMethod: req.body.paymentMethod,
		transactionId: String(req.body.transactionId ?? ""),
		senderPhone: req.body.senderPhone
			? String(req.body.senderPhone)
			: undefined,
	});

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Transaction ID submitted for verification",
		data: result,
	});
};

// ==================================================
// Verify Online Payment (Admin / Manager)
// ==================================================

export const verifyOnlinePaymentController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const admissionId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}
	if (!Number.isInteger(admissionId) || admissionId <= 0) {
		throw new AppError(400, "Invalid admission ID");
	}
	if (!req.user?.userId) {
		throw new AppError(401, "Unauthorized");
	}

	const result = await verifyOnlineAdmissionPayment(
		schoolId,
		admissionId,
		req.user.userId,
		{ remarks: req.body?.remarks },
	);

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Online payment verified successfully",
		data: result,
	});
};

// ==================================================
// Reject Online Payment (Admin / Manager)
// ==================================================

export const rejectOnlinePaymentController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const admissionId = Number(req.params.id);

	if (!Number.isInteger(schoolId) || schoolId <= 0) {
		throw new AppError(400, "Invalid school ID");
	}
	if (!Number.isInteger(admissionId) || admissionId <= 0) {
		throw new AppError(400, "Invalid admission ID");
	}
	if (!req.user?.userId) {
		throw new AppError(401, "Unauthorized");
	}

	const result = await rejectOnlineAdmissionPayment(
		schoolId,
		admissionId,
		req.user.userId,
		{ remarks: String(req.body?.remarks ?? "") },
	);

	return sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Online payment rejected",
		data: result,
	});
};
