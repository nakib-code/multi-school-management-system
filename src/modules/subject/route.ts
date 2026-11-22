import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createSubjectController,
	deleteSubjectController,
	getActiveSubjectsController,
	getSubjectByIdController,
	getSubjectsController,
	toggleSubjectStatusController,
	updateSubjectController,
} from "./controller.js";
import {
	createSubjectSchema,
	subjectParamsSchema,
	subjectSchoolParamsSchema,
	updateSubjectSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/subjects",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SUBJECT_MANAGEMENT),
	validateRequest(createSubjectSchema),
	createSubjectController,
);

router.get(
	"/schools/:schoolId/subjects",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SUBJECT_MANAGEMENT),
	validateRequest(subjectSchoolParamsSchema),
	getSubjectsController,
);

router.get(
	"/schools/:schoolId/subjects/active",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SUBJECT_MANAGEMENT),
	validateRequest(subjectSchoolParamsSchema),
	getActiveSubjectsController,
);

router.get(
	"/schools/:schoolId/subjects/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SUBJECT_MANAGEMENT),
	validateRequest(subjectParamsSchema),
	getSubjectByIdController,
);

router.patch(
	"/schools/:schoolId/subjects/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SUBJECT_MANAGEMENT),
	validateRequest(updateSubjectSchema),
	updateSubjectController,
);

router.patch(
	"/schools/:schoolId/subjects/:id/toggle-status",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SUBJECT_MANAGEMENT),
	validateRequest(subjectParamsSchema),
	toggleSubjectStatusController,
);

router.delete(
	"/schools/:schoolId/subjects/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SUBJECT_MANAGEMENT),
	validateRequest(subjectParamsSchema),
	deleteSubjectController,
);

export const subjectRoutes = router;
