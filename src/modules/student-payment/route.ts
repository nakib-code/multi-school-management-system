import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getStudentPaymentByIdController,
	getStudentPaymentsController,
	rejectStudentPaymentController,
	submitStudentPaymentController,
	verifyStudentPaymentController,
} from "./controller.js";
import {
	createStudentPaymentSchema,
	rejectStudentPaymentSchema,
	studentPaymentParamsSchema,
	studentPaymentSchoolParamsSchema,
} from "./validation.js";

const router = Router();

// Submit manual bKash / Nagad / Rocket payment (status = PENDING)
router.post(
	"/schools/:schoolId/student-payments",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.PAYMENT_MANAGEMENT),
	validateRequest(createStudentPaymentSchema),
	submitStudentPaymentController,
);

router.get(
	"/schools/:schoolId/student-payments",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.PAYMENT_MANAGEMENT),
	validateRequest(studentPaymentSchoolParamsSchema),
	getStudentPaymentsController,
);

router.get(
	"/schools/:schoolId/student-payments/:id",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.PAYMENT_MANAGEMENT),
	validateRequest(studentPaymentParamsSchema),
	getStudentPaymentByIdController,
);

// Admin / Manager verify payment -> recalculates StudentFee balance & status
router.patch(
	"/schools/:schoolId/student-payments/:id/verify",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.PAYMENT_MANAGEMENT),
	validateRequest(studentPaymentParamsSchema),
	verifyStudentPaymentController,
);

// Admin / Manager reject payment -> stores rejectionReason without marking fee paid
router.patch(
	"/schools/:schoolId/student-payments/:id/reject",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.PAYMENT_MANAGEMENT),
	validateRequest(rejectStudentPaymentSchema),
	rejectStudentPaymentController,
);

export const studentPaymentRoutes = router;
