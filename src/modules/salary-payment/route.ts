import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { requireSchoolFeature } from "../../middleware/schoolFeature.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createSalaryPaymentController,
	getSalaryPaymentByIdController,
	getSalaryPaymentsController,
	updateSalaryPaymentController,
} from "./controller.js";
import {
	createSalaryPaymentSchema,
	salaryPaymentParamsSchema,
	salaryPaymentSchoolParamsSchema,
	updateSalaryPaymentSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/salary-payments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(createSalaryPaymentSchema),
	createSalaryPaymentController,
);

router.get(
	"/schools/:schoolId/salary-payments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(salaryPaymentSchoolParamsSchema),
	getSalaryPaymentsController,
);

router.get(
	"/schools/:schoolId/salary-payments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(salaryPaymentParamsSchema),
	getSalaryPaymentByIdController,
);

router.patch(
	"/schools/:schoolId/salary-payments/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requireSchoolFeature("hasTeacherPayroll"),
	validateRequest(updateSalaryPaymentSchema),
	updateSalaryPaymentController,
);

export const salaryPaymentRoutes = router;
