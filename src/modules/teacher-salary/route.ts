import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { requireSchoolFeature } from "../../middleware/schoolFeature.js";
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
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(createTeacherSalarySchema),
	createTeacherSalaryController,
);

router.get(
	"/schools/:schoolId/teacher-salaries",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(teacherSalarySchoolParamsSchema),
	getTeacherSalariesController,
);

router.get(
	"/schools/:schoolId/teacher-salaries/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(teacherSalaryParamsSchema),
	getTeacherSalaryByIdController,
);

router.patch(
	"/schools/:schoolId/teacher-salaries/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(updateTeacherSalarySchema),
	updateTeacherSalaryController,
);

router.delete(
	"/schools/:schoolId/teacher-salaries/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(teacherSalaryParamsSchema),
	deleteTeacherSalaryController,
);

export const teacherSalaryRoutes = router;
