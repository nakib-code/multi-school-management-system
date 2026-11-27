import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	createClassController,
	deleteClassController,
	getActiveClassesController,
	getClassByIdController,
	getClassesController,
	getClassFeeStructuresController,
	toggleClassStatusController,
	updateClassController,
	upsertClassFeeStructuresController,
} from "./controller.js";

import {
	createClassSchema,
	getClassFeeStructuresSchema,
	schoolClassParamsSchema,
	schoolClassSchoolParamsSchema,
	toggleClassStatusSchema,
	updateClassSchema,
	upsertClassFeeStructuresSchema,
} from "./validation.js";

const router = Router();

// ============================================
// CLASS MANAGEMENT
// ============================================

// Create
router.post(
	"/schools/:schoolId/classes",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createClassSchema),
	createClassController,
);

// Get all
router.get(
	"/schools/:schoolId/classes",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(schoolClassSchoolParamsSchema),
	getClassesController,
);

// Get active classes
router.get(
	"/schools/:schoolId/classes/active",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(schoolClassSchoolParamsSchema),
	getActiveClassesController,
);

// Class Fee Structures (ADMIN / MANAGER read, ADMIN upsert)
router.get(
	"/schools/:schoolId/classes/fee-structures",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(getClassFeeStructuresSchema),
	getClassFeeStructuresController,
);

router.put(
	"/schools/:schoolId/classes/:classId/fee-structures",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(upsertClassFeeStructuresSchema),
	upsertClassFeeStructuresController,
);

// Get single
router.get(
	"/schools/:schoolId/classes/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(schoolClassParamsSchema),
	getClassByIdController,
);

// Update
router.patch(
	"/schools/:schoolId/classes/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateClassSchema),
	updateClassController,
);

// Toggle status
router.patch(
	"/schools/:schoolId/classes/:id/toggle-status",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(toggleClassStatusSchema),
	toggleClassStatusController,
);

// Delete
router.delete(
	"/schools/:schoolId/classes/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(schoolClassParamsSchema),
	deleteClassController,
);

export const classRoutes = router;
