import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";

import { requireSchoolAccess } from "../../middleware/schoolAccess.js";

import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getAdmissionFeeController,
	updateAdmissionFeeController,
} from "./controller.js";
import { updateAdmissionFeeSchema } from "./validation.js";

const router = Router();

// ======================================================
// GET ADMISSION FEE
// ADMIN / MANAGER
// ======================================================

router.get(
	"/schools/:schoolId/settings/admission-fee",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	getAdmissionFeeController,
);

// ======================================================
// UPDATE ADMISSION FEE
// ADMIN / MANAGER
// ======================================================

router.patch(
	"/schools/:schoolId/settings/admission-fee",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateAdmissionFeeSchema),
	updateAdmissionFeeController,
);

export const schoolSettingRoutes = router;
