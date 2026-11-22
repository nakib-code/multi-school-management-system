import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createTeacherSalaryController,
	deleteTeacherSalaryController,
	getTeacherSalariesController,
	getTeacherSalaryByIdController,
	updateTeacherSalaryController,
} from "./controller.js";
import {
	createTeacherSalarySchema,
	teacherSalaryParamsSchema,
	teacherSalarySchoolParamsSchema,
	updateTeacherSalarySchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/teacher-salaries",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_SALARY),
	validateRequest(createTeacherSalarySchema),
	createTeacherSalaryController,
);

router.get(
	"/schools/:schoolId/teacher-salaries",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_SALARY),
	validateRequest(teacherSalarySchoolParamsSchema),
	getTeacherSalariesController,
);

router.get(
	"/schools/:schoolId/teacher-salaries/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_SALARY),
	validateRequest(teacherSalaryParamsSchema),
	getTeacherSalaryByIdController,
);

router.patch(
	"/schools/:schoolId/teacher-salaries/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_SALARY),
	validateRequest(updateTeacherSalarySchema),
	updateTeacherSalaryController,
);

router.delete(
	"/schools/:schoolId/teacher-salaries/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.TEACHER_SALARY),
	validateRequest(teacherSalaryParamsSchema),
	deleteTeacherSalaryController,
);

export const teacherSalaryRoutes = router;
