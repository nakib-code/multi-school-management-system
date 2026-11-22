import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	activateStudentController,
	deactivateStudentController,
	getAllStudentsController,
	getMyStudentProfileController,
	getStudentByIdController,
	updateStudentController,
} from "./controller.js";

import { updateStudentSchema } from "./validation.js";

const router = Router();

router.get(
	"/schools/:schoolId/students/me",
	authenticate,
	authorize(UserRole.STUDENT),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.STUDENT_MANAGEMENT),
	getMyStudentProfileController,
);

router.get(
	"/schools/:schoolId/students",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.STUDENT_MANAGEMENT),
	getAllStudentsController,
);

router.get(
	"/schools/:schoolId/students/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.STUDENT_MANAGEMENT),
	getStudentByIdController,
);

router.patch(
	"/schools/:schoolId/students/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.STUDENT_MANAGEMENT),
	validateRequest(updateStudentSchema),
	updateStudentController,
);

router.delete(
	"/schools/:schoolId/students/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.STUDENT_MANAGEMENT),
	deactivateStudentController,
);

router.patch(
	"/schools/:schoolId/students/:id/activate",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.STUDENT_MANAGEMENT),
	activateStudentController,
);

export const studentRoutes = router;
