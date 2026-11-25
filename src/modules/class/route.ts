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
	toggleClassStatusController,
	updateClassController,
} from "./controller.js";

import {
	createClassSchema,
	schoolClassParamsSchema,
	schoolClassSchoolParamsSchema,
	toggleClassStatusSchema,
	updateClassSchema,
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
