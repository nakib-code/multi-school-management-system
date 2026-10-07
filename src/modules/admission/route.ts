import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import {
  authenticate,
  authorize,
} from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
  approveAdmissionController,
  confirmCashPaymentController,
  createAdmissionController,
  getAdmissionByIdController,
  initiateOnlinePaymentController,
  paymentCancelController,
  paymentFailController,
  paymentIpnController,
  paymentSuccessController,
  rejectAdmissionController,
  trackAdmissionController,
  verifyStudentEmailController,
} from "./controller.js";

import {
  confirmCashPaymentSchema,
  createAdmissionSchema,
  rejectAdmissionSchema,
  trackAdmissionSchema,
  verifyStudentEmailSchema,
} from "./validation.js";

const router = Router();

// ====================================================
// Public Admission
// ====================================================

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

// ====================================================
// School Admission Management
// ====================================================

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
  authorize(
    UserRole.ADMIN,
    UserRole.MANAGER,
  ),
  requireSchoolAccess,
  validateRequest(rejectAdmissionSchema),
  rejectAdmissionController,
);

// ====================================================
// Cash Payment
// ====================================================

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

// ====================================================
// Online Payment
// ====================================================

router.post(
  "/schools/:schoolId/admissions/:id/payment/online/initiate",
  initiateOnlinePaymentController,
);

// ====================================================
// Public Admission Tracking
// ====================================================

router.post(
  "/admissions/track",
  validateRequest(trackAdmissionSchema),
  trackAdmissionController,
);

// ====================================================
// SSLCommerz Callbacks
// ====================================================

router.post(
  "/payments/admission/success",
  paymentSuccessController,
);

router.post(
  "/payments/admission/ipn",
  paymentIpnController,
);

router.post(
  "/payments/admission/fail",
  paymentFailController,
);

router.post(
  "/payments/admission/cancel",
  paymentCancelController,
);

export const admissionRoutes = router;