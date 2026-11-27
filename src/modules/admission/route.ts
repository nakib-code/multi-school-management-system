import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { requireSchoolFeature } from "../../middleware/schoolFeature.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	approveAdmissionController,
	confirmCashPaymentController,
	createAdmissionController,
	createPublicSlugAdmissionController,
	getAdmissionByIdController,
	getAdmissionsController,
	initiateOnlinePaymentController,
	rejectAdmissionController,
	rejectOnlinePaymentController,
	submitOnlinePaymentTrxController,
	trackAdmissionController,
	verifyOnlinePaymentController,
	verifyStudentEmailController,
} from "./controller.js";

import {
	confirmCashPaymentSchema,
	createAdmissionSchema,
	createPublicSlugAdmissionSchema,
	getAdmissionsSchema,
	initiateOnlinePaymentSchema,
	rejectAdmissionSchema,
	rejectOnlinePaymentSchema,
	submitOnlinePaymentTrxSchema,
	trackAdmissionSchema,
	verifyOnlinePaymentSchema,
	verifyStudentEmailSchema,
} from "./validation.js";

const router = Router();

const publicAdmissionLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 20,
	keyPrefix: "public-admission",
	message: "Too many admission requests. Please try again later.",
});

const admissionTrackLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 30,
	keyPrefix: "admission-track",
	message: "Too many tracking requests. Please try again later.",
});

// ====================================================
// Public Admission
// ====================================================

router.post(
	"/schools/:schoolId/admissions",
	publicAdmissionLimiter,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(createAdmissionSchema),
	createAdmissionController,
);

router.post(
	"/public/schools/:slug/admissions",
	publicAdmissionLimiter,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(createPublicSlugAdmissionSchema),
	createPublicSlugAdmissionController,
);

router.post(
	"/admissions/verify-email",
	publicAdmissionLimiter,
	validateRequest(verifyStudentEmailSchema),
	verifyStudentEmailController,
);

// ====================================================
// School Admission Management
// ====================================================

router.get(
	"/schools/:schoolId/admissions",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(getAdmissionsSchema),
	getAdmissionsController,
);

router.get(
	"/schools/:schoolId/admissions/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	getAdmissionByIdController,
);

router.patch(
	"/schools/:schoolId/admissions/:id/approve",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	approveAdmissionController,
);

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
// Online Payment (Initiate, Applicant TrxID Submit, Admin Verify/Reject)
// ====================================================

router.post(
	"/schools/:schoolId/admissions/:id/payment/online/initiate",
	publicAdmissionLimiter,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(initiateOnlinePaymentSchema),
	initiateOnlinePaymentController,
);

router.patch(
	"/schools/:schoolId/admissions/:id/payment/verify-online",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(verifyOnlinePaymentSchema),
	verifyOnlinePaymentController,
);

router.patch(
	"/schools/:schoolId/admissions/:id/payment/reject-online",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasOnlineAdmission"),
	validateRequest(rejectOnlinePaymentSchema),
	rejectOnlinePaymentController,
);

// ====================================================
// Public Admission Tracking & TrxID Submission
// ====================================================

router.post(
	"/admissions/track",
	admissionTrackLimiter,
	validateRequest(trackAdmissionSchema),
	trackAdmissionController,
);

router.post(
	"/admissions/track/payment",
	admissionTrackLimiter,
	validateRequest(submitOnlinePaymentTrxSchema),
	submitOnlinePaymentTrxController,
);

export const admissionRoutes = router;
