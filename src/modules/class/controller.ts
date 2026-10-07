import type {
  NextFunction,
  Request,
  Response,
} from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import {
  createClass,
  deleteClass,
  getActiveClasses,
  getClassById,
  getClasses,
  toggleClassStatus,
  updateClass,
} from "./service.js";

export const createClassController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await createClass(
      schoolId,
      req.body,
    );

    return sendResponse(res, {
      statusCode: 201,
      message: "Class created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await getClasses(schoolId);

    return sendResponse(res, {
      statusCode: 200,
      message: "Classes retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveClassesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await getActiveClasses(schoolId);

    return sendResponse(res, {
      statusCode: 200,
      message: "Active classes retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const classId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    if (!Number.isInteger(classId) || classId <= 0) {
      throw new AppError(400, "Invalid class ID");
    }

    const result = await getClassById(
      schoolId,
      classId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Class retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateClassController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const classId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    if (!Number.isInteger(classId) || classId <= 0) {
      throw new AppError(400, "Invalid class ID");
    }

    const result = await updateClass(
      schoolId,
      classId,
      req.body,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Class updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleClassStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const classId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    if (!Number.isInteger(classId) || classId <= 0) {
      throw new AppError(400, "Invalid class ID");
    }

    const result = await toggleClassStatus(
      schoolId,
      classId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: `Class ${
        result.isActive ? "activated" : "deactivated"
      } successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClassController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const classId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    if (!Number.isInteger(classId) || classId <= 0) {
      throw new AppError(400, "Invalid class ID");
    }

    const result = await deleteClass(
      schoolId,
      classId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Class deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};