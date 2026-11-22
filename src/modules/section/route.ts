import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	createSectionController,
	deleteSectionController,
	getActiveSectionsController,
	getSectionByIdController,
	getSectionsController,
	toggleSectionStatusController,
	updateSectionController,
} from "./controller.js";

import {
	createSectionSchema,
	sectionParamsSchema,
	sectionSchoolParamsSchema,
	toggleSectionStatusSchema,
	updateSectionSchema,
} from "./validation.js";

const router = Router();

// ============================================
// SECTION MANAGEMENT
// ============================================

// Create
router.post(
	"/schools/:schoolId/sections",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(createSectionSchema),
	createSectionController,
);

// Get all
router.get(
	"/schools/:schoolId/sections",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(sectionSchoolParamsSchema),
	getSectionsController,
);

// Get active
router.get(
	"/schools/:schoolId/sections/active",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(sectionSchoolParamsSchema),
	getActiveSectionsController,
);

// Get single
router.get(
	"/schools/:schoolId/sections/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(sectionParamsSchema),
	getSectionByIdController,
);

// Update
router.patch(
	"/schools/:schoolId/sections/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(updateSectionSchema),
	updateSectionController,
);

// Toggle status
router.patch(
	"/schools/:schoolId/sections/:id/toggle-status",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(toggleSectionStatusSchema),
	toggleSectionStatusController,
);

// Delete
router.delete(
	"/schools/:schoolId/sections/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.CLASS_MANAGEMENT),
	validateRequest(sectionParamsSchema),
	deleteSectionController,
);

export const sectionRoutes = router;
