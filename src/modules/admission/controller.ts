import type { Request, Response } from "express";
import { approveAdmission, createAdmission, getAdmissionById, rejectAdmission } from "./service.js";
import sendResponse from "../../utils/sendResponse.js";

export const createAdmissionController = async (
  req: Request,
  res: Response,
) => {
  const result = await createAdmission(req.body);

  return sendResponse(res, {
    statusCode: 201,
    message: "Admission application submitted successfully",
    data: result,
  });
};

import { verifyStudentEmail } from "./service.js";
import AppError from "../../utils/appError.js";
import type { AuthRequest } from "../../middleware/auth.js";

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
