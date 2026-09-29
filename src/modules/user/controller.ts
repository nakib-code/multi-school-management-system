import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type {
  GetUsersQuery,
  UpdateUserStatusParams,
} from "./interface.js";
import {
  getUsers,
  updateUserStatus,
} from "./service.js";

export const getUsersController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getUsers(
      req.query as unknown as GetUsersQuery,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Users retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatusController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError(400, "Invalid user ID");
    }

    const { status } = req.body as UpdateUserStatusParams;

    const result = await updateUserStatus({
      id: userId,
      status,
    });

    return sendResponse(res, {
      statusCode: 200,
      message:
        status === "ACTIVE"
          ? "Admin unblocked successfully"
          : "Admin blocked successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
