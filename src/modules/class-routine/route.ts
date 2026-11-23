import { Router } from "express";
import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
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
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
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
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(routineSchoolParamsSchema),
	getRoutinesController,
);

router.patch(
	"/schools/:schoolId/routines/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(updateRoutineSchema),
	updateRoutineController,
);

router.delete(
	"/schools/:schoolId/routines/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(routineIdParamsSchema),
	deleteRoutineController,
);

export const classRoutineRoutes = router;
