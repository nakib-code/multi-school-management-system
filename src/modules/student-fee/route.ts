import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createStudentFeeController,
	deleteStudentFeeController,
	getStudentFeeByIdController,
	getStudentFeesController,
	updateStudentFeeController,
} from "./controller.js";
import {
	createStudentFeeSchema,
	studentFeeParamsSchema,
	studentFeeSchoolParamsSchema,
	updateStudentFeeSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/student-fees",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.FEES_MANAGEMENT),
	validateRequest(createStudentFeeSchema),
	createStudentFeeController,
);

router.get(
	"/schools/:schoolId/student-fees",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.FEES_MANAGEMENT),
	validateRequest(studentFeeSchoolParamsSchema),
	getStudentFeesController,
);

router.get(
	"/schools/:schoolId/student-fees/:id",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.FEES_MANAGEMENT),
	validateRequest(studentFeeParamsSchema),
	getStudentFeeByIdController,
);

router.patch(
	"/schools/:schoolId/student-fees/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.FEES_MANAGEMENT),
	validateRequest(updateStudentFeeSchema),
	updateStudentFeeController,
);

router.delete(
	"/schools/:schoolId/student-fees/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.FEES_MANAGEMENT),
	validateRequest(studentFeeParamsSchema),
	deleteStudentFeeController,
);

export const studentFeeRoutes = router;
