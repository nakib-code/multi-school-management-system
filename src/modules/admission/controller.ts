import type { Request, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { getPaymentCallbackData } from "../payment/service.js";
import {
  approveAdmission,
  confirmCashPayment,
  createAdmission,
  getAdmissionById,
  getAdmissions,
  initiateOnlinePayment,
  rejectAdmission,
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
    ...(req.query.page
      ? { page: Number(req.query.page) }
      : {}),

    ...(req.query.limit
      ? { limit: Number(req.query.limit) }
      : {}),

    ...(typeof req.query.search === "string"
      ? { search: req.query.search }
      : {}),

    ...(typeof req.query.status === "string"
      ? { status: req.query.status }
      : {}),

    ...(typeof req.query.paymentStatus === "string"
      ? { paymentStatus: req.query.paymentStatus }
      : {}),
  };

  const result = await getAdmissions(
    schoolId,
    query,
  );

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

  const result = await getAdmissionById(
    schoolId,
    admissionId,
  );

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

  const result = await approveAdmission(
    schoolId,
    admissionId,
    req.user.userId,
  );

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
    req.body.remarks,
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

  const result = await initiateOnlinePayment(
    schoolId,
    admissionId,
  );

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Online payment initiated successfully",
    data: result,
  });
};

// ==================================================
// SSLCommerz Success
// ==================================================

export const paymentSuccessController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData({
    ...req.body,
    ...req.query,
  });

  if (!callbackData.val_id) {
    throw new AppError(
      400,
      "SSLCommerz validation ID is missing",
    );
  }

  if (!callbackData.tran_id) {
    throw new AppError(
      400,
      "SSLCommerz transaction ID is missing",
    );
  }

  if (!callbackData.value_a) {
    throw new AppError(400, "Admission ID is missing");
  }

  const admissionId = Number(callbackData.value_a);

  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    throw new AppError(400, "Invalid admission ID");
  }

  // Verify payment before redirecting
  const result = await verifyOnlineAdmissionPayment(
    admissionId,
    callbackData,
  );

  const frontendUrl =
    process.env.FRONTEND_URL ??
    "http://localhost:3000";

  const params = new URLSearchParams({
    admissionId: String(result.admissionId),
  });

  if (result.transactionId) {
    params.set(
      "transactionId",
      result.transactionId,
    );
  }

  return res.redirect(
    303,
    `${frontendUrl}/admissions/payment/success?${params.toString()}`,
  );
};

// ==================================================
// SSLCommerz IPN
// ==================================================

export const paymentIpnController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData({
    ...req.body,
    ...req.query,
  });

  if (!callbackData.tran_id) {
    throw new AppError(
      400,
      "SSLCommerz transaction ID is missing",
    );
  }

  if (!callbackData.value_a) {
    throw new AppError(400, "Admission ID is missing");
  }

  const admissionId = Number(callbackData.value_a);

  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    throw new AppError(400, "Invalid admission ID");
  }

  const result = await verifyOnlineAdmissionPayment(
    admissionId,
    callbackData,
  );

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admission payment IPN processed successfully",
    data: result,
  });
};

// ==================================================
// SSLCommerz Fail
// ==================================================

export const paymentFailController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData({
    ...req.body,
    ...req.query,
  });

  if (!callbackData.tran_id) {
    throw new AppError(
      400,
      "SSLCommerz transaction ID is missing",
    );
  }

  const payment =
    await prisma.admissionPayment.findFirst({
      where: {
        transactionId: callbackData.tran_id,
        status: "PENDING",
      },
    });

  if (payment) {
    await prisma.admissionPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "FAILED",
        remarks: "Online admission payment failed",
      },
    });
  }

  const frontendUrl =
    process.env.FRONTEND_URL ??
    "http://localhost:3000";

  const params = new URLSearchParams({
    transactionId: callbackData.tran_id,
  });

  return res.redirect(
    303,
    `${frontendUrl}/admissions/payment/fail?${params.toString()}`,
  );
};

// ==================================================
// SSLCommerz Cancel
// ==================================================

export const paymentCancelController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData({
    ...req.body,
    ...req.query,
  });

  if (!callbackData.tran_id) {
    throw new AppError(
      400,
      "SSLCommerz transaction ID is missing",
    );
  }

  const payment =
    await prisma.admissionPayment.findFirst({
      where: {
        transactionId: callbackData.tran_id,
        status: "PENDING",
      },
    });

  if (payment) {
    await prisma.admissionPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "CANCELLED",
        remarks: "Online admission payment cancelled",
      },
    });
  }

  const frontendUrl =
    process.env.FRONTEND_URL ??
    "http://localhost:3000";

  const params = new URLSearchParams({
    transactionId: callbackData.tran_id,
  });

  return res.redirect(
    303,
    `${frontendUrl}/admissions/payment/cancel?${params.toString()}`,
  );
};

// ==================================================
// Track Admission
// ==================================================

export const trackAdmissionController = async (
  req: Request,
  res: Response,
) => {
  const result = await trackAdmission({
    applicationNo: String(
      req.body.applicationNo ?? "",
    ),
    studentEmail: String(
      req.body.studentEmail ?? "",
    ),
  });

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message:
      "Admission application fetched successfully",
    data: result,
  });
};