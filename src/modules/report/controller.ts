import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import { getReportOverview } from "./service.js";

export const getReportOverviewController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const result = await getReportOverview();

    return sendResponse(res, {
      statusCode: 200,
      message: "Report data retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
