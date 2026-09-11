import { Router } from "express";

import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
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
	getMyStudentProfileController,
);

router.get(
	"/schools/:schoolId/students",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	getAllStudentsController,
);

router.get(
	"/schools/:schoolId/students/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	getStudentByIdController,
);

router.patch(
	"/schools/:schoolId/students/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateStudentSchema),
	updateStudentController,
);

router.delete(
	"/schools/:schoolId/students/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	deactivateStudentController,
);

router.patch(
	"/schools/:schoolId/students/:id/activate",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	activateStudentController,
);

export const studentRoutes = router;