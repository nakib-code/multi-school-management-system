import type { Request, Response, NextFunction } from "express";
import sendResponse from "../../utils/sendResponse.js";
import { approveSchool, createSchool } from "./service.js";
import AppError from "../../utils/appError.js";
import type { AuthRequest } from "../../middleware/auth.js";

export const createSchoolController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createSchool(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: "School registration submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const approveSchoolController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);

    if (Number.isNaN(schoolId)) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await approveSchool(
      schoolId,
      req.user!.userId,
    );

    sendResponse(res, {
      statusCode: 200,
      message: "School approved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};