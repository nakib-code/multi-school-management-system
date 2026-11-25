import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createRoutineController,
	deleteRoutineController,
	getRoutinesController,
	updateRoutineController,
} from "./controller.js";
import {
	createRoutineSchema,
	routineIdParamsSchema,
	routineSchoolParamsSchema,
	updateRoutineSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/routines",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createRoutineSchema),
	createRoutineController,
);

router.get(
	"/schools/:schoolId/routines",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.STUDENT,
		UserRole.GUARDIAN,
	),
	requireSchoolAccess,
	validateRequest(routineSchoolParamsSchema),
	getRoutinesController,
);

router.patch(
	"/schools/:schoolId/routines/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateRoutineSchema),
	updateRoutineController,
);

router.delete(
	"/schools/:schoolId/routines/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(routineIdParamsSchema),
	deleteRoutineController,
);

export const classRoutineRoutes = router;
