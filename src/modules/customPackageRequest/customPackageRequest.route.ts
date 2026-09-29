import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.js";

import { UserRole } from "../../generated/prisma/client.js";

import {
  customPackageRequestController,
} from "./customPackageRequest.controller.js";

const router = Router();

// ====================================================
// SCHOOL USERS
// ====================================================

// Create custom package request
router.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  customPackageRequestController.create,
);

// Get my school's requests
router.get(
  "/my",
  authenticate,
  authorize(UserRole.ADMIN),
  customPackageRequestController.getMyRequests,
);

// Cancel my school's pending request
router.patch(
  "/:id/cancel",
  authenticate,
  authorize(UserRole.ADMIN),
  customPackageRequestController.cancel,
);

// ====================================================
// SUPER ADMIN
// ====================================================

// Get all custom package requests
router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  customPackageRequestController.getAll,
);

// Get request details
router.get(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  customPackageRequestController.getById,
);

// Approve / Reject request
router.patch(
  "/:id/review",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  customPackageRequestController.review,
);

export const customPackageRequestRouter =
  router;