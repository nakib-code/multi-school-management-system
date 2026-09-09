import { Router } from "express";

import {
  approveAdmissionController,
  createAdmissionController,
  getAdmissionByIdController,
  rejectAdmissionController,
  verifyStudentEmailController,
} from "./controller.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import {
  createAdmissionSchema,
  rejectAdmissionSchema,
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

router.patch(
  "/schools/:schoolId/admissions/:id/reject",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  requireSchoolAccess,
  validateRequest(rejectAdmissionSchema),
  rejectAdmissionController,
);


export const admissionRoutes = router;
