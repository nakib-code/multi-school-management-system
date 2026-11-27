import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getAdmissionFeeController,
	getSchoolFeaturesController,
	getSchoolPaymentMethodsController,
	getWebsiteConnectionController,
	rotateWebsiteConnectionKeyController,
	updateAdmissionFeeController,
	updateSchoolFeaturesController,
	updateSchoolPaymentMethodsController,
	updateWebsiteConnectionController,
} from "./controller.js";
import {
	updateAdmissionFeeSchema,
	updateSchoolFeaturesSchema,
	updateSchoolPaymentMethodsSchema,
	updateWebsiteConnectionSchema,
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
	authorize(UserRole.ADMIN),
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
	authorize(UserRole.ADMIN),
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
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(updateSchoolPaymentMethodsSchema),
	updateSchoolPaymentMethodsController,
);

// ======================================================
// EXTERNAL WEBSITE CONNECTION & LANDING ADMIN CREDENTIALS
// ======================================================

router.get(
	"/schools/:schoolId/settings/website-connection",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	getWebsiteConnectionController,
);

router.patch(
	"/schools/:schoolId/settings/website-connection",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(updateWebsiteConnectionSchema),
	updateWebsiteConnectionController,
);

router.post(
	"/schools/:schoolId/settings/website-connection/rotate-key",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	rotateWebsiteConnectionKeyController,
);

export const schoolSettingRoutes = router;
