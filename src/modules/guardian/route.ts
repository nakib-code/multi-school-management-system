import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createGuardianController,
	deleteGuardianController,
	getGuardianByIdController,
	getGuardiansController,
	linkStudentToGuardianController,
	unlinkStudentFromGuardianController,
	updateGuardianController,
} from "./controller.js";
import {
	createGuardianSchema,
	guardianParamsSchema,
	guardianSchoolParamsSchema,
	guardianStudentParamsSchema,
	linkGuardianStudentSchema,
	updateGuardianSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/guardians",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(createGuardianSchema),
	createGuardianController,
);

router.get(
	"/schools/:schoolId/guardians",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(guardianSchoolParamsSchema),
	getGuardiansController,
);

router.get(
	"/schools/:schoolId/guardians/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	validateRequest(guardianParamsSchema),
	getGuardianByIdController,
);

router.patch(
	"/schools/:schoolId/guardians/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(updateGuardianSchema),
	updateGuardianController,
);

router.post(
	"/schools/:schoolId/guardians/:id/students",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(linkGuardianStudentSchema),
	linkStudentToGuardianController,
);

router.delete(
	"/schools/:schoolId/guardians/:id/students/:studentId",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(guardianStudentParamsSchema),
	unlinkStudentFromGuardianController,
);

router.delete(
	"/schools/:schoolId/guardians/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(guardianParamsSchema),
	deleteGuardianController,
);

export const guardianRoutes = router;
