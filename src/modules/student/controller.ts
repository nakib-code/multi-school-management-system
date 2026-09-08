import type { Request, Response, NextFunction } from "express";
import sendResponse from "../../utils/sendResponse.js";
import { createSchool } from "./service.js";

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