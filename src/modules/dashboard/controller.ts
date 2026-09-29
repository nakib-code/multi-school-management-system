import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import { getDashboard } from "./service.js";

export const getDashboardController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const result = await getDashboard(req.user);

    return sendResponse(res, {
      statusCode: 200,
      message: "Dashboard data retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};