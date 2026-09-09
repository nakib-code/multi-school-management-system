import { Router } from "express";
import {
  createSchoolController,
  approveSchoolController,
  verifyAdminEmailController,
} from "./controller.js";

import { validateRequest } from "../../middleware/validateRequest.js";
import { createSchoolSchema, verifyAdminEmailSchema } from "./validation.js";
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

// SUPER_ADMIN only
router.patch(
  "/:id/approve",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  approveSchoolController,
);

router.post(
  "/verify-admin-email",
  validateRequest(verifyAdminEmailSchema),
  verifyAdminEmailController,
);

export const schoolRoutes = router;