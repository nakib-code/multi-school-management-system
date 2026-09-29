import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
  approveSchoolController,
  blockSchoolController,
  createSchoolController,
  deleteSchoolController,
  getSchoolsController,
  rejectSchoolController,
  unblockSchoolController,
  verifyAdminEmailController,
} from "./controller.js";

import {
  createSchoolSchema,
  rejectSchoolSchema,
  verifyAdminEmailSchema,
} from "./validation.js";

const router = Router();

/**
 * PUBLIC
 * School registration
 */
router.post(
  "/register",
  validateRequest(createSchoolSchema),
  createSchoolController,
);

/**
 * PUBLIC
 * Verify admin email
 */
router.post(
  "/verify-admin-email",
  validateRequest(verifyAdminEmailSchema),
  verifyAdminEmailController,
);

/**
 * SUPER ADMIN
 * Get all schools
 *
 * GET /api/v1/schools
 * GET /api/v1/schools?page=1&limit=10
 * GET /api/v1/schools?search=abc
 * GET /api/v1/schools?status=PENDING
 */
router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  getSchoolsController,
);

/**
 * SUPER ADMIN
 * Approve school
 */
router.patch(
  "/:id/approve",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  approveSchoolController,
);

/**
 * SUPER ADMIN
 * Block school
 */
router.patch(
  "/:id/block",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  blockSchoolController,
);

/**
 * SUPER ADMIN
 * Unblock school
 */
router.patch(
  "/:id/unblock",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  unblockSchoolController,
);

/**
 * SUPER ADMIN
 * Reject school
 */
router.patch(
  "/:id/reject",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validateRequest(rejectSchoolSchema),
  rejectSchoolController,
);

/**
 * SUPER ADMIN
 * Delete rejected school
 */
router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  deleteSchoolController,
);

export const schoolRoutes = router;