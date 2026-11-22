import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createResultController,
	deleteResultController,
	getResultByIdController,
	getResultsController,
	updateResultController,
} from "./controller.js";
import {
	createResultSchema,
	resultParamsSchema,
	resultSchoolParamsSchema,
	updateResultSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/results",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.RESULT_MANAGEMENT),
	validateRequest(createResultSchema),
	createResultController,
);

router.get(
	"/schools/:schoolId/results",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.RESULT_MANAGEMENT),
	validateRequest(resultSchoolParamsSchema),
	getResultsController,
);

router.get(
	"/schools/:schoolId/results/:id",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.RESULT_MANAGEMENT),
	validateRequest(resultParamsSchema),
	getResultByIdController,
);

router.patch(
	"/schools/:schoolId/results/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.RESULT_MANAGEMENT),
	validateRequest(updateResultSchema),
	updateResultController,
);

router.delete(
	"/schools/:schoolId/results/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.RESULT_MANAGEMENT),
	validateRequest(resultParamsSchema),
	deleteResultController,
);

export const resultRoutes = router;
