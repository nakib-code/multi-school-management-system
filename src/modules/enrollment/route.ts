import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createEnrollmentController,
	deleteEnrollmentController,
	getEnrollmentByIdController,
	getEnrollmentsController,
	updateEnrollmentController,
} from "./controller.js";
import {
	createEnrollmentSchema,
	enrollmentParamsSchema,
	enrollmentSchoolParamsSchema,
	updateEnrollmentSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/enrollments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createEnrollmentSchema),
	createEnrollmentController,
);

router.get(
	"/schools/:schoolId/enrollments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(enrollmentSchoolParamsSchema),
	getEnrollmentsController,
);

router.get(
	"/schools/:schoolId/enrollments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(enrollmentParamsSchema),
	getEnrollmentByIdController,
);

router.patch(
	"/schools/:schoolId/enrollments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateEnrollmentSchema),
	updateEnrollmentController,
);

router.delete(
	"/schools/:schoolId/enrollments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(enrollmentParamsSchema),
	deleteEnrollmentController,
);

export const enrollmentRoutes = router;
