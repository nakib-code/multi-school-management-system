import type { Request, Response, NextFunction } from "express";
import { login, signup } from "./service.js";
import sendResponse from "../../utils/sendResponse.js";

export const signupController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await signup(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await login(req.body);

    sendResponse(res, {
      statusCode: 200,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};