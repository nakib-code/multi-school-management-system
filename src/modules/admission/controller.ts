import type { Request, Response } from "express";
import { approveAdmission, confirmCashPayment, createAdmission, getAdmissionById, initiateOnlinePayment, rejectAdmission, verifyOnlineAdmissionPayment } from "./service.js";
import sendResponse from "../../utils/sendResponse.js";

import { verifyStudentEmail } from "./service.js";
import AppError from "../../utils/appError.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { getPaymentCallbackData } from "../payment/service.js";
import { prisma } from "../../lib/prisma.js";


export const createAdmissionController = async (
  req: Request,
  res: Response,
) => {
  const schoolId = Number(req.params.schoolId);

  if (!schoolId || Number.isNaN(schoolId)) {
    throw new AppError(400, "Invalid school ID");
  }

  const result = await createAdmission({
    ...req.body,
    schoolId,
  });

  return sendResponse(res, {
    statusCode: 201,
    message: "Admission application submitted successfully",
    data: result,
  });
};


export const verifyStudentEmailController = async (
  req: Request,
  res: Response,
) => {
  const result = await verifyStudentEmail(req.body);

  return sendResponse(res, {
    statusCode: 200,
    message: "Student email verified successfully",
    data: result,
  });
};



export const getAdmissionByIdController = async (
  req: AuthRequest,
  res: Response,
) => {
  const schoolId = Number(req.params.schoolId);
  const admissionId = Number(req.params.id);

  if (!schoolId || Number.isNaN(schoolId)) {
    throw new AppError(400, "Invalid school ID");
  }

  if (!admissionId || Number.isNaN(admissionId)) {
    throw new AppError(400, "Invalid admission ID");
  }

  const result = await getAdmissionById(
    schoolId,
    admissionId,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Admission retrieved successfully",
    data: result,
  });
};


export const approveAdmissionController = async (
  req: AuthRequest,
  res: Response,
) => {
  const schoolId = Number(req.params.schoolId);
  const admissionId = Number(req.params.id);

  if (!schoolId || Number.isNaN(schoolId)) {
    throw new AppError(
      400,
      "Invalid school ID",
    );
  }

  if (!admissionId || Number.isNaN(admissionId)) {
    throw new AppError(
      400,
      "Invalid admission ID",
    );
  }

  if (!req.user) {
    throw new AppError(
      401,
      "Authentication required",
    );
  }

  const result = await approveAdmission(
    schoolId,
    admissionId,
    req.user.userId,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Admission approved successfully",
    data: result,
  });
};

export const rejectAdmissionController = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const schoolId = Number(req.params.schoolId);
  const admissionId = Number(req.params.id);

  if (!schoolId || Number.isNaN(schoolId)) {
    throw new AppError(400, "Invalid school ID");
  }

  if (!admissionId || Number.isNaN(admissionId)) {
    throw new AppError(400, "Invalid admission ID");
  }

  const { rejectionReason } = req.body;

  const result = await rejectAdmission(
    schoolId,
    admissionId,
    req.user.userId,
    rejectionReason,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Admission rejected successfully",
    data: result,
  });
};

export const confirmCashPaymentController = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) {
    throw new AppError(
      401,
      "Authentication required",
    );
  }

  const schoolId = Number(req.params.schoolId);
  const admissionId = Number(req.params.id);

  if (!schoolId || Number.isNaN(schoolId)) {
    throw new AppError(
      400,
      "Invalid school ID",
    );
  }

  if (!admissionId || Number.isNaN(admissionId)) {
    throw new AppError(
      400,
      "Invalid admission ID",
    );
  }

  const result = await confirmCashPayment(
    schoolId,
    admissionId,
    req.user.userId,
    req.body,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Cash payment confirmed successfully",
    data: result,
  });
};

export const initiateOnlinePaymentController = async (
  req: Request,
  res: Response,
) => {
  const schoolId = Number(req.params.schoolId);
  const admissionId = Number(req.params.id);

  if (!schoolId || Number.isNaN(schoolId)) {
    throw new AppError(400, "Invalid school ID");
  }

  if (!admissionId || Number.isNaN(admissionId)) {
    throw new AppError(400, "Invalid admission ID");
  }

  const result = await initiateOnlinePayment(
    schoolId,
    admissionId,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Online payment initiated successfully",
    data: result,
  });
};

export const paymentSuccessController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData(req.body);

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
    throw new AppError(
      400,
      "Admission ID is missing from payment callback",
    );
  }

  const admissionId = Number(callbackData.value_a);

  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    throw new AppError(
      400,
      "Invalid admission ID in payment callback",
    );
  }

  const result = await verifyOnlineAdmissionPayment(
    admissionId,
    callbackData,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Admission payment completed successfully",
    data: result,
  });
};


export const paymentIpnController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData(req.body);

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
    throw new AppError(
      400,
      "Admission ID is missing from payment callback",
    );
  }

  const admissionId = Number(callbackData.value_a);

  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    throw new AppError(
      400,
      "Invalid admission ID in payment callback",
    );
  }

  const result = await verifyOnlineAdmissionPayment(
    admissionId,
    callbackData,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Admission payment verified successfully",
    data: result,
  });
};

export const paymentFailController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData(req.body);

  if (!callbackData.tran_id) {
    throw new AppError(
      400,
      "SSLCommerz transaction ID is missing",
    );
  }

  if (!callbackData.value_a) {
    throw new AppError(
      400,
      "Admission ID is missing from payment callback",
    );
  }

  const admissionId = Number(callbackData.value_a);

  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    throw new AppError(
      400,
      "Invalid admission ID in payment callback",
    );
  }

  const admission = await prisma.admission.findUnique({
    where: {
      id: admissionId,
    },
    select: {
      id: true,
      schoolId: true,
      status: true,
      payment: {
        select: {
          id: true,
          paymentMethod: true,
          status: true,
          transactionId: true,
        },
      },
    },
  });

  if (!admission) {
    throw new AppError(404, "Admission not found");
  }

  if (!admission.payment) {
    throw new AppError(
      404,
      "Admission payment not found",
    );
  }

  if (admission.payment.paymentMethod !== "ONLINE") {
    throw new AppError(
      400,
      "This admission is not using online payment",
    );
  }

  if (
    admission.payment.transactionId !== callbackData.tran_id
  ) {
    throw new AppError(
      400,
      "Transaction ID does not match",
    );
  }

  if (admission.payment.status === "PAID") {
    throw new AppError(
      400,
      "Payment has already been completed",
    );
  }

  const payment = await prisma.admissionPayment.update({
    where: {
      id: admission.payment.id,
    },
    data: {
      status: "FAILED",
    },
    select: {
      id: true,
      admissionId: true,
      schoolId: true,
      amount: true,
      paymentMethod: true,
      status: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: "Payment failed",
    data: {
      ...payment,
      amount: Number(payment.amount),
    },
  });
};

export const paymentCancelController = async (
  req: Request,
  res: Response,
) => {
  const callbackData = getPaymentCallbackData(req.body);

  if (!callbackData.tran_id) {
    throw new AppError(
      400,
      "SSLCommerz transaction ID is missing",
    );
  }

  if (!callbackData.value_a) {
    throw new AppError(
      400,
      "Admission ID is missing from payment callback",
    );
  }

  const admissionId = Number(callbackData.value_a);

  if (!Number.isInteger(admissionId) || admissionId <= 0) {
    throw new AppError(
      400,
      "Invalid admission ID in payment callback",
    );
  }

  const admission = await prisma.admission.findUnique({
    where: {
      id: admissionId,
    },
    select: {
      id: true,
      payment: {
        select: {
          id: true,
          paymentMethod: true,
          status: true,
          transactionId: true,
        },
      },
    },
  });

  if (!admission) {
    throw new AppError(404, "Admission not found");
  }

  if (!admission.payment) {
    throw new AppError(
      404,
      "Admission payment not found",
    );
  }

  if (admission.payment.paymentMethod !== "ONLINE") {
    throw new AppError(
      400,
      "This admission is not using online payment",
    );
  }

  if (
    admission.payment.transactionId !== callbackData.tran_id
  ) {
    throw new AppError(
      400,
      "Transaction ID does not match",
    );
  }

  if (admission.payment.status === "PAID") {
    throw new AppError(
      400,
      "Payment has already been completed",
    );
  }

  const payment = await prisma.admissionPayment.update({
    where: {
      id: admission.payment.id,
    },
    data: {
      status: "CANCELLED",
    },
    select: {
      id: true,
      admissionId: true,
      schoolId: true,
      amount: true,
      paymentMethod: true,
      status: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: "Payment cancelled",
    data: {
      ...payment,
      amount: Number(payment.amount),
    },
  });
};

