import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getAdmissionFeeController,
	getSchoolFeaturesController,
	getSchoolPaymentMethodsController,
	updateAdmissionFeeController,
	updateSchoolFeaturesController,
	updateSchoolPaymentMethodsController,
} from "./controller.js";
import {
	updateAdmissionFeeSchema,
	updateSchoolFeaturesSchema,
	updateSchoolPaymentMethodsSchema,
} from "./validation.js";

const router = Router();

// ======================================================
// ADMISSION FEE & GENERAL SETTINGS (ADMIN / MANAGER)
// ======================================================

router.get(
	"/schools/:schoolId/settings/admission-fee",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	getAdmissionFeeController,
);

router.patch(
	"/schools/:schoolId/settings/admission-fee",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateAdmissionFeeSchema),
	updateAdmissionFeeController,
);

// ======================================================
// PER-SCHOOL FEATURE FLAGS (SUPER ADMIN TOGGLE)
// ======================================================

router.get(
	"/school-settings/:schoolId/features",
	authenticate,
	authorize(
		UserRole.SUPER_ADMIN,
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	getSchoolFeaturesController,
);

router.patch(
	"/school-settings/:schoolId/features",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(updateSchoolFeaturesSchema),
	updateSchoolFeaturesController,
);

// ======================================================
// SCHOOL-LEVEL MOBILE BANKING PAYMENT METHODS
// ======================================================

router.get(
	"/school-settings/payment-methods",
	authenticate,
	getSchoolPaymentMethodsController,
);

router.patch(
	"/school-settings/payment-methods",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	validateRequest(updateSchoolPaymentMethodsSchema),
	updateSchoolPaymentMethodsController,
);

router.get(
	"/schools/:schoolId/settings/payment-methods",
	authenticate,
	requireSchoolAccess,
	getSchoolPaymentMethodsController,
);

router.patch(
	"/schools/:schoolId/settings/payment-methods",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateSchoolPaymentMethodsSchema),
	updateSchoolPaymentMethodsController,
);

export const schoolSettingRoutes = router;
