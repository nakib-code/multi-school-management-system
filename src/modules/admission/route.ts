import { Router } from "express";

import {
  approveAdmissionController,
  confirmCashPaymentController,
  createAdmissionController,
  getAdmissionByIdController,
  initiateOnlinePaymentController,
  rejectAdmissionController,
  verifyStudentEmailController,
} from "./controller.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import {
  confirmCashPaymentSchema,
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
  "/schools/:schoolId/admissions",
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

router.patch(
  "/schools/:schoolId/admissions/:id/payment/confirm-cash",
  authenticate,
  authorize(
    UserRole.ADMIN,
    UserRole.MANAGER,
  ),
  requireSchoolAccess,
  validateRequest(confirmCashPaymentSchema),
  confirmCashPaymentController,
);

router.post(
  "/schools/:schoolId/admissions/:id/payment/online/initiate",
  initiateOnlinePaymentController,
);



export const admissionRoutes = router;
