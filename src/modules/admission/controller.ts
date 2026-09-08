import type { Request, Response, NextFunction } from "express";
import sendResponse from "../../utils/sendResponse.js";
import { createAdmission } from "./service.js";

export const createAdmissionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createAdmission(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: "Admission application submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};