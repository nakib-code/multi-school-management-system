import { Router } from "express";
import { PackageFeature, UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	createTeacherController,
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

export const teacherRoutes = router;
