import type { Request, Response } from "express";
import { createAdmission } from "./service.js";
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