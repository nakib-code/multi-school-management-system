import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	createTeacherController,
	deactivateTeacherController,
	getTeacherByIdController,
	getTeachersController,
	resendTeacherOtpController,
	resetTeacherPasswordController,
	updateTeacherController,
	verifyTeacherEmailController,
} from "./controller.js";

import {
	createTeacherSchema,
	resetTeacherPasswordSchema,
	verifyTeacherEmailSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/teachers",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createTeacherSchema),
	createTeacherController,
);

router.patch(
	"/schools/:schoolId/teachers/:id/verify-email",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(verifyTeacherEmailSchema),
	verifyTeacherEmailController,
);

router.post(
	"/schools/:schoolId/teachers/:id/resend-otp",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	resendTeacherOtpController,
);

router.post(
	"/schools/:schoolId/teachers/:id/reset-password",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(resetTeacherPasswordSchema),
	resetTeacherPasswordController,
);

router.get(
	"/schools/:schoolId/teachers",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	getTeachersController,
);

router.get(
	"/schools/:schoolId/teachers/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	getTeacherByIdController,
);

router.patch(
	"/schools/:schoolId/teachers/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	updateTeacherController,
);

router.delete(
	"/schools/:schoolId/teachers/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	deactivateTeacherController,
);

export const teacherRoutes = router;
