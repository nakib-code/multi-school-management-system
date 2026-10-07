import type {
  NextFunction,
  Request,
  Response,
} from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import {
  createSection,
  deleteSection,
  getActiveSections,
  getSectionById,
  getSections,
  toggleSectionStatus,
  updateSection,
} from "./service.js";

export const createSectionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const result = await createSection(
      schoolId,
      req.body,
    );

    return sendResponse(res, {
      statusCode: 201,
      message: "Section created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSectionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const classId =
      req.query.classId !== undefined
        ? Number(req.query.classId)
        : undefined;

    if (
      classId !== undefined &&
      (!Number.isInteger(classId) || classId <= 0)
    ) {
      throw new AppError(400, "Invalid class ID");
    }

    const result = await getSections(
      schoolId,
      classId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Sections retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveSectionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    const classId =
      req.query.classId !== undefined
        ? Number(req.query.classId)
        : undefined;

    if (
      classId !== undefined &&
      (!Number.isInteger(classId) || classId <= 0)
    ) {
      throw new AppError(400, "Invalid class ID");
    }

    const result = await getActiveSections(
      schoolId,
      classId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Active sections retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSectionByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const sectionId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    if (
      !Number.isInteger(sectionId) ||
      sectionId <= 0
    ) {
      throw new AppError(400, "Invalid section ID");
    }

    const result = await getSectionById(
      schoolId,
      sectionId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Section retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSectionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const sectionId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    if (
      !Number.isInteger(sectionId) ||
      sectionId <= 0
    ) {
      throw new AppError(400, "Invalid section ID");
    }

    const result = await updateSection(
      schoolId,
      sectionId,
      req.body,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Section updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleSectionStatusController =
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const schoolId = Number(req.params.schoolId);
      const sectionId = Number(req.params.id);

      if (
        !Number.isInteger(schoolId) ||
        schoolId <= 0
      ) {
        throw new AppError(400, "Invalid school ID");
      }

      if (
        !Number.isInteger(sectionId) ||
        sectionId <= 0
      ) {
        throw new AppError(
          400,
          "Invalid section ID",
        );
      }

      const result = await toggleSectionStatus(
        schoolId,
        sectionId,
      );

      return sendResponse(res, {
        statusCode: 200,
        message: `Section ${
          result.isActive
            ? "activated"
            : "deactivated"
        } successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export const deleteSectionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const sectionId = Number(req.params.id);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError(400, "Invalid school ID");
    }

    if (
      !Number.isInteger(sectionId) ||
      sectionId <= 0
    ) {
      throw new AppError(
        400,
        "Invalid section ID",
      );
    }

    const result = await deleteSection(
      schoolId,
      sectionId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: "Section deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};