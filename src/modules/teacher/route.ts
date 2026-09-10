import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.js";

import { UserRole } from "../../generated/prisma/enums.js";

import { requireSchoolAccess } from "../../middleware/schoolAccess.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import { createTeacherController, verifyTeacherEmailController } from "./controller.js";

import { createTeacherSchema, verifyTeacherEmailSchema } from "./validation.js";

const router = Router();

router.post(
  "/schools/:schoolId/teachers",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  requireSchoolAccess,
  validateRequest(createTeacherSchema),
  createTeacherController,
);

router.patch(
  "/schools/:schoolId/teachers/:id/verify-email",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  requireSchoolAccess,
  validateRequest(verifyTeacherEmailSchema),
  verifyTeacherEmailController,
);

export const teacherRoutes = router;