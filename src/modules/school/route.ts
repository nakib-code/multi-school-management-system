import { Router } from "express";
import {
  createSchoolController,
  approveSchoolController,
  verifyAdminEmailController,
  blockSchoolController,
  unblockSchoolController,
  rejectSchoolController,
  deleteSchoolController,
} from "./controller.js";

import { validateRequest } from "../../middleware/validateRequest.js";
import { createSchoolSchema, rejectSchoolSchema, verifyAdminEmailSchema } from "./validation.js";
import {
  authenticate,
  authorize,
} from "../../middleware/auth.js";

import { UserRole } from "../../generated/prisma/client.js";

const router = Router();

// Public school registration
router.post(
  "/register",
  validateRequest(createSchoolSchema),
  createSchoolController,
);

router.post(
  "/verify-admin-email",
  validateRequest(verifyAdminEmailSchema),
  verifyAdminEmailController,
);

// SUPER_ADMIN only
router.patch(
  "/:id/approve",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  approveSchoolController,
);


router.patch(
  "/:id/block",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  blockSchoolController,
);

router.patch(
  "/:id/unblock",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  unblockSchoolController,
);

router.patch(
  "/:id/reject",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  validateRequest(rejectSchoolSchema),
  rejectSchoolController,
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  deleteSchoolController,
);

export const schoolRoutes = router;