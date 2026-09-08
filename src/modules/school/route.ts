import { Router } from "express";
import {
  createSchoolController,
  approveSchoolController,
} from "./controller.js";

import { validateRequest } from "../../middleware/validateRequest.js";
import { createSchoolSchema } from "./validation.js";
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

export const schoolRoutes = router;