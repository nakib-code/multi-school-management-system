import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";

import { authenticate, authorize } from "../../middleware/auth.js";

import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { requireSchoolFeature } from "../../middleware/schoolFeature.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import {
	approveAdmissionController,
	confirmCashPaymentController,
	createAdmissionController,
	getAdmissionByIdController,
	getAdmissionsController,
	initiateOnlinePaymentController,
	rejectAdmissionController,
	trackAdmissionController,
	verifyStudentEmailController,
} from "./controller.js";

import {
	confirmCashPaymentSchema,
	createAdmissionSchema,
	getAdmissionsSchema,
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
	requireSchoolFeature("hasOnlineAdmission"),
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

// Get Admissions
router.get(
	"/schools/:schoolId/admissions",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(getAdmissionsSchema),
	getAdmissionsController,
);

// Get Admission By ID
router.get(
	"/schools/:schoolId/admissions/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	getAdmissionByIdController,
);

// Approve Admission
router.patch(
	"/schools/:schoolId/admissions/:id/approve",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	approveAdmissionController,
);

// Reject Admission
router.patch(
	"/schools/:schoolId/admissions/:id/reject",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(rejectAdmissionSchema),
	rejectAdmissionController,
);

// ====================================================
// Cash Payment
// ====================================================

router.patch(
	"/schools/:schoolId/admissions/:id/payment/confirm-cash",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
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

export const admissionRoutes = router;
