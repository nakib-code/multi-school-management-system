import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";

import {
  createCustomPackageRequestSchema,
  customPackageRequestIdSchema,
  customPackageRequestQuerySchema,
  reviewCustomPackageRequestSchema,
} from "./customPackageRequest.validation.js";

import {
  cancelCustomPackageRequest,
  createCustomPackageRequest,
  getAllCustomPackageRequests,
  getCustomPackageRequestById,
  getSchoolCustomPackageRequests,
  reviewCustomPackageRequest,
} from "./customPackageRequest.service.js";

export const customPackageRequestController = {
  create: async (
    req: AuthRequest,
    res: Response,
  ) => {
    const payload =
      createCustomPackageRequestSchema.parse(
        req.body,
      );

    const result =
      await createCustomPackageRequest(
        payload,
      );

    res.status(201).json({
      success: true,
      message:
        "Custom package request created successfully",
      data: result,
    });
  },

  getAll: async (
    req: AuthRequest,
    res: Response,
  ) => {
    const query =
      customPackageRequestQuerySchema.parse(
        req.query,
      );

    const result =
      await getAllCustomPackageRequests(
        query,
      );

    res.status(200).json({
      success: true,
      message:
        "Custom package requests fetched successfully",
      data: result,
    });
  },

  getById: async (
    req: AuthRequest,
    res: Response,
  ) => {
    const { id } =
      customPackageRequestIdSchema.parse(
        req.params,
      );

    const result =
      await getCustomPackageRequestById(id);

    res.status(200).json({
      success: true,
      message:
        "Custom package request fetched successfully",
      data: result,
    });
  },

  getMyRequests: async (
    req: AuthRequest,
    res: Response,
  ) => {
    if (!req.user?.schoolId) {
      return res.status(403).json({
        success: false,
        message:
          "School information is missing",
      });
    }

    const result =
      await getSchoolCustomPackageRequests(
        req.user.schoolId,
      );

    res.status(200).json({
      success: true,
      message:
        "School custom package requests fetched successfully",
      data: result,
    });
  },

  review: async (
    req: AuthRequest,
    res: Response,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const { id } =
      customPackageRequestIdSchema.parse(
        req.params,
      );

    const payload =
      reviewCustomPackageRequestSchema.parse(
        req.body,
      );

    const result =
      await reviewCustomPackageRequest(
        id,
        req.user.userId,
        payload,
      );

    res.status(200).json({
      success: true,
      message:
        payload.status === "APPROVED"
          ? "Custom package request approved successfully"
          : "Custom package request rejected successfully",
      data: result,
    });
  },

  cancel: async (
    req: AuthRequest,
    res: Response,
  ) => {
    if (!req.user?.schoolId) {
      return res.status(403).json({
        success: false,
        message:
          "School information is missing",
      });
    }

    const { id } =
      customPackageRequestIdSchema.parse(
        req.params,
      );

    const result =
      await cancelCustomPackageRequest(
        id,
        req.user.schoolId,
      );

    res.status(200).json({
      success: true,
      message:
        "Custom package request cancelled successfully",
      data: result,
    });
  },
};