import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	approveSchoolController,
	blockSchoolController,
	createSchoolController,
	deleteSchoolController,
	getSchoolsController,
	getSchoolUserSummaryController,
	getSchoolUsersController,
	rejectSchoolController,
	unblockSchoolController,
	verifyAdminEmailController,
} from "./controller.js";

import {
	createSchoolSchema,
	getSchoolUsersSchema,
	rejectSchoolSchema,
	schoolIdParamsSchema,
	verifyAdminEmailSchema,
} from "./validation.js";

const router = Router();

/**
 * =========================================================
 * SCHOOL REGISTRATION
 * =========================================================
 */

router.post(
	"/register",
	validateRequest(createSchoolSchema),
	createSchoolController,
);

router.post(
	"/verify-admin-email",
	validateRequest(verifyAdminEmailSchema),
	verifyAdminEmailController,
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

export const schoolRoutes = router;
