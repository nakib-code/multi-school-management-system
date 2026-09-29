import type { NextFunction, Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import {
  approveSchool,
  blockSchool,
  createSchool,
  deleteSchool,
  getSchools,
  getSchoolUsers,
  getSchoolUserSummary,
  rejectSchool,
  unblockSchool,
  verifyAdminEmail,
} from "./service.js";
import type { GetSchoolUsersQuery } from "./interface.js";

export const createSchoolController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createSchool(req.body);

    return sendResponse(res, {
      statusCode: 201,
      message: "School registration submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSchoolsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const allowedStatuses = [
      "PENDING",
      "ACTIVE",
      "BLOCKED",
      "REJECTED",
    ] as const;

    const validStatus = allowedStatuses.includes(
      status as (typeof allowedStatuses)[number],
    )
      ? (status as (typeof allowedStatuses)[number])
      : undefined;

    const result = await getSchools({
      page,
      limit,
      search,
      ...(validStatus ? { status: validStatus } : {}),
    });

    return sendResponse(res, {
      statusCode: 200,
      message: "Schools retrieved successfully",
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

    const result = await approveSchool(schoolId);

    return sendResponse(res, {
      statusCode: 200,
      message: "School approved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAdminEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await verifyAdminEmail(req.body);

    return sendResponse(res, {
      statusCode: 200,
      message: "Admin email verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const blockSchoolController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);

    if (Number.isNaN(schoolId)) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await blockSchool(schoolId);

    return sendResponse(res, {
      statusCode: 200,
      message: "School blocked successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const unblockSchoolController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);

    if (Number.isNaN(schoolId)) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await unblockSchool(schoolId);

    return sendResponse(res, {
      statusCode: 200,
      message: "School unblocked successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectSchoolController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);

    if (Number.isNaN(schoolId)) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await rejectSchool(schoolId, req.body);

    return sendResponse(res, {
      statusCode: 200,
      message: "School rejected successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSchoolController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);

    if (Number.isNaN(schoolId)) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await deleteSchool(schoolId);

    return sendResponse(res, {
      statusCode: 200,
      message: "School deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


export const getSchoolUserSummaryController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await getSchoolUserSummary(schoolId);

    return sendResponse(res, {
      statusCode: 200,
      message: "School user summary retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSchoolUsersController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const page = Math.max(
      Number(req.query.page) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 10,
        1,
      ),
      100,
    );

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : undefined;

    const role =
      typeof req.query.role === "string"
        ? (req.query.role as GetSchoolUsersQuery["role"])
        : undefined;

    const status =
      typeof req.query.status === "string"
        ? (req.query.status as GetSchoolUsersQuery["status"])
        : undefined;

    const query: GetSchoolUsersQuery = {
      page,
      limit,

      ...(search !== undefined && {
        search,
      }),

      ...(role !== undefined && {
        role,
      }),

      ...(status !== undefined && {
        status,
      }),
    };

    const result = await getSchoolUsers(
      schoolId,
      query,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "School users retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
