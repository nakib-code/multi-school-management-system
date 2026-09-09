import { Router } from "express";

import {
  approveAdmissionController,
  createAdmissionController,
  getAdmissionByIdController,
  verifyStudentEmailController,
} from "./controller.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import {
  createAdmissionSchema,
  verifyStudentEmailSchema,
} from "./validation.js";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.js";

import { UserRole } from "../../generated/prisma/enums.js";

import { requireSchoolAccess } from "../../middleware/schoolAccess.js";

const router = Router();


// ======================================================
// Public Admission Routes
// ======================================================

router.post(
  "/admissions",
  validateRequest(createAdmissionSchema),
  createAdmissionController,
);

router.post(
  "/admissions/verify-email",
  validateRequest(verifyStudentEmailSchema),
  verifyStudentEmailController,
);


// ======================================================
// School Admission Routes
// ======================================================

router.get(
  "/schools/:schoolId/admissions/:id",
  authenticate,
  authorize(
    UserRole.ADMIN,
    UserRole.MANAGER,
  ),
  requireSchoolAccess,
  getAdmissionByIdController,
);

router.patch(
  "/schools/:schoolId/admissions/:id/approve",
  authenticate,
  authorize(
    UserRole.ADMIN,
    UserRole.MANAGER,
  ),
  requireSchoolAccess,
  approveAdmissionController,
);


export const admissionRoutes = router;
