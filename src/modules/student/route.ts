import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.js";

import { UserRole } from "../../generated/prisma/enums.js";

import { requireSchoolAccess } from "../../middleware/schoolAccess.js";

import {
  getMyStudentProfileController,
} from "./controller.js";

const router = Router();

router.get(
  "/schools/:schoolId/students/me",
  authenticate,
  authorize(UserRole.STUDENT),
  requireSchoolAccess,
  getMyStudentProfileController,
);

export const studentRoutes = router;