import { Router } from "express";
import { PackageFeature, UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	createTeacherController,
	deactivateTeacherController,
	getTeacherByIdController,
	getTeachersController,
	updateTeacherController,
	verifyTeacherEmailController,
} from "./controller.js";

import { createTeacherSchema, verifyTeacherEmailSchema } from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/teachers",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_MANAGEMENT),
	validateRequest(createTeacherSchema),
	createTeacherController,
);

router.patch(
	"/schools/:schoolId/teachers/:id/verify-email",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_MANAGEMENT),
	validateRequest(verifyTeacherEmailSchema),
	verifyTeacherEmailController,
);

router.get(
	"/schools/:schoolId/teachers",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_MANAGEMENT),
	getTeachersController,
);

router.get(
	"/schools/:schoolId/teachers/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_MANAGEMENT),
	getTeacherByIdController,
);

router.patch(
	"/schools/:schoolId/teachers/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_MANAGEMENT),
	updateTeacherController,
);

router.delete(
	"/schools/:schoolId/teachers/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_MANAGEMENT),
	deactivateTeacherController,
);

export const teacherRoutes = router;
