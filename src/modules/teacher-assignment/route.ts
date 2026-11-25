import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createTeacherAssignmentController,
	deleteTeacherAssignmentController,
	getTeacherAssignmentByIdController,
	getTeacherAssignmentsController,
	updateTeacherAssignmentController,
} from "./controller.js";
import {
	createTeacherAssignmentSchema,
	teacherAssignmentParamsSchema,
	teacherAssignmentSchoolParamsSchema,
	updateTeacherAssignmentSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/teacher-assignments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createTeacherAssignmentSchema),
	createTeacherAssignmentController,
);

router.get(
	"/schools/:schoolId/teacher-assignments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(teacherAssignmentSchoolParamsSchema),
	getTeacherAssignmentsController,
);

router.get(
	"/schools/:schoolId/teacher-assignments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(teacherAssignmentParamsSchema),
	getTeacherAssignmentByIdController,
);

router.patch(
	"/schools/:schoolId/teacher-assignments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateTeacherAssignmentSchema),
	updateTeacherAssignmentController,
);

router.delete(
	"/schools/:schoolId/teacher-assignments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(teacherAssignmentParamsSchema),
	deleteTeacherAssignmentController,
);

export const teacherAssignmentRoutes = router;
