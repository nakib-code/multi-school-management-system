import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import { getMyStudentProfile } from "./service.js";

export const getMyStudentProfileController = async (
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

  if (!schoolId || Number.isNaN(schoolId)) {
    throw new AppError(
      400,
      "Invalid school ID",
    );
  }

  const result = await getMyStudentProfile(
    req.user.userId,
    schoolId,
  );

  return sendResponse(res, {
    statusCode: 200,
    message: "Student profile retrieved successfully",
    data: result,
  });
};