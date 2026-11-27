import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	approveSchoolController,
	blockSchoolController,
	createSchoolController,
	deleteSchoolController,
	getPublicSchoolByIdController,
	getPublicSchoolsController,
	getSchoolProfileController,
	getSchoolsController,
	getSchoolUserSummaryController,
	getSchoolUsersController,
	rejectSchoolController,
	unblockSchoolController,
	updateSchoolProfileController,
	verifyAdminEmailController,
} from "./controller.js";

import {
	createSchoolSchema,
	getSchoolUsersSchema,
	rejectSchoolSchema,
	schoolIdParamsSchema,
	updateSchoolProfileSchema,
	verifyAdminEmailSchema,
} from "./validation.js";

const router = Router();

const schoolRegisterLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 10,
	keyPrefix: "school-register",
	message: "Too many school registration attempts. Please try again later.",
});

const verifyEmailLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 15,
	keyPrefix: "school-verify-email",
	message: "Too many verification attempts. Please try again later.",
});

/**
 * =========================================================
 * SCHOOL REGISTRATION
 * =========================================================
 */

router.post(
	"/register",
	schoolRegisterLimiter,
	validateRequest(createSchoolSchema),
	createSchoolController,
);

router.post(
	"/verify-admin-email",
	verifyEmailLimiter,
	validateRequest(verifyAdminEmailSchema),
	verifyAdminEmailController,
);

/**
 * =========================================================
 * SCHOOL ADMIN / MANAGER - OWN SCHOOL PROFILE & LOGO
 * =========================================================
 */

router.get(
	"/:id/profile",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN),
	validateRequest(schoolIdParamsSchema),
	getSchoolProfileController,
);

router.patch(
	"/:id/profile",
	authenticate,
	authorize(UserRole.ADMIN),
	validateRequest(updateSchoolProfileSchema),
	updateSchoolProfileController,
);

/**
 * =========================================================
 * SUPER ADMIN - SCHOOLS
 * =========================================================
 */

router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	getSchoolsController,
);

/**
 * =========================================================
 * SUPER ADMIN - SCHOOL USERS
 * =========================================================
 */

/**
 * Get user summary for a specific school
 *
 * GET /api/v1/schools/:id/users/summary
 */
router.get(
	"/:id/users/summary",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(schoolIdParamsSchema),
	getSchoolUserSummaryController,
);

/**
 * Get users of a specific school
 *
 * GET /api/v1/schools/:id/users
 *
 * Examples:
 * ?role=ADMIN
 * ?role=MANAGER
 * ?role=TEACHER
 * ?role=STUDENT
 * ?role=GUARDIAN
 * ?status=ACTIVE
 * ?search=rahim
 */
router.get(
	"/:id/users",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(getSchoolUsersSchema),
	getSchoolUsersController,
);

/**
 * =========================================================
 * SUPER ADMIN - SCHOOL ACTIONS
 * =========================================================
 */

router.patch(
	"/:id/approve",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	approveSchoolController,
);

router.patch(
	"/:id/block",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	blockSchoolController,
);

router.patch(
	"/:id/unblock",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	unblockSchoolController,
);

router.patch(
	"/:id/reject",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(rejectSchoolSchema),
	rejectSchoolController,
);

router.delete(
	"/:id",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	deleteSchoolController,
);

/**
 * =========================================================
 * PUBLIC - SCHOOL DETAILS
 * =========================================================
 *
 * GET /api/v1/schools/:id/public
 */

router.get(
	"/:id/public",
	validateRequest(schoolIdParamsSchema),
	getPublicSchoolByIdController,
);

/**
 * =========================================================
 * PUBLIC - SCHOOL LIST
 * =========================================================
 *
 * GET /api/v1/schools/public
 */

router.get("/public", getPublicSchoolsController);

export const schoolRoutes = router;
