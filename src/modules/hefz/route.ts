import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createHefzEnrollmentController,
	deleteHefzDailyLogController,
	deleteHefzEnrollmentController,
	getGuardianChildrenHefzProgressController,
	getHefzDailyLogByIdController,
	getHefzDailyLogsController,
	getHefzEnrollmentByIdController,
	getHefzEnrollmentsController,
	getStudentHefzProgressController,
	updateHefzDailyLogController,
	updateHefzEnrollmentController,
	upsertHefzDailyLogController,
} from "./controller.js";
import {
	createHefzDailyLogSchema,
	createHefzEnrollmentSchema,
	hefzDailyLogQuerySchema,
	hefzEnrollmentQuerySchema,
	hefzGuardianProgressSchema,
	hefzIdParamsSchema,
	hefzStudentProgressSchema,
	updateHefzDailyLogSchema,
	updateHefzEnrollmentSchema,
} from "./validation.js";

const router = Router();

// ============================================
// HEFZ & NAJERA ENROLLMENTS
// ============================================

router.post(
	"/schools/:schoolId/hefz/enrollments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(createHefzEnrollmentSchema),
	createHefzEnrollmentController,
);

router.get(
	"/schools/:schoolId/hefz/enrollments",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzEnrollmentQuerySchema),
	getHefzEnrollmentsController,
);

router.get(
	"/schools/:schoolId/hefz/enrollments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzIdParamsSchema),
	getHefzEnrollmentByIdController,
);

router.patch(
	"/schools/:schoolId/hefz/enrollments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(updateHefzEnrollmentSchema),
	updateHefzEnrollmentController,
);

router.delete(
	"/schools/:schoolId/hefz/enrollments/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzIdParamsSchema),
	deleteHefzEnrollmentController,
);

// ============================================
// DAILY SOBOK / SOBOK-E-AM / MANZIL LOGS
// ============================================

router.post(
	"/schools/:schoolId/hefz/daily-logs",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(createHefzDailyLogSchema),
	upsertHefzDailyLogController,
);

router.get(
	"/schools/:schoolId/hefz/daily-logs",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzDailyLogQuerySchema),
	getHefzDailyLogsController,
);

router.get(
	"/schools/:schoolId/hefz/daily-logs/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzIdParamsSchema),
	getHefzDailyLogByIdController,
);

router.patch(
	"/schools/:schoolId/hefz/daily-logs/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(updateHefzDailyLogSchema),
	updateHefzDailyLogController,
);

router.delete(
	"/schools/:schoolId/hefz/daily-logs/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzIdParamsSchema),
	deleteHefzDailyLogController,
);

// ============================================
// GUARDIAN & STUDENT PROGRESS REPORTS
// ============================================

router.get(
	"/schools/:schoolId/hefz/guardian/progress",
	authenticate,
	authorize(UserRole.GUARDIAN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzGuardianProgressSchema),
	getGuardianChildrenHefzProgressController,
);

router.get(
	"/schools/:schoolId/hefz/students/:studentId/progress",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.HEFZ_MODULE),
	validateRequest(hefzStudentProgressSchema),
	getStudentHefzProgressController,
);

export const hefzRoutes = router;
