import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createExamController,
	deleteExamController,
	getExamByIdController,
	getExamsController,
	updateExamController,
} from "./controller.js";
import {
	createExamSchema,
	examParamsSchema,
	examSchoolParamsSchema,
	updateExamSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/exams",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createExamSchema),
	createExamController,
);

router.get(
	"/schools/:schoolId/exams",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	validateRequest(examSchoolParamsSchema),
	getExamsController,
);

router.get(
	"/schools/:schoolId/exams/:id",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	validateRequest(examParamsSchema),
	getExamByIdController,
);

router.patch(
	"/schools/:schoolId/exams/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateExamSchema),
	updateExamController,
);

router.delete(
	"/schools/:schoolId/exams/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(examParamsSchema),
	deleteExamController,
);

export const examRoutes = router;
