import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	bulkMarkAttendanceController,
	createAttendanceController,
	deleteAttendanceController,
	getAttendanceByIdController,
	getAttendancesController,
	updateAttendanceController,
} from "./controller.js";
import {
	attendanceParamsSchema,
	attendanceSchoolParamsSchema,
	bulkAttendanceSchema,
	createAttendanceSchema,
	updateAttendanceSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/attendances",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.ATTENDANCE),
	validateRequest(createAttendanceSchema),
	createAttendanceController,
);

router.post(
	"/schools/:schoolId/attendances/bulk",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.ATTENDANCE),
	validateRequest(bulkAttendanceSchema),
	bulkMarkAttendanceController,
);

router.get(
	"/schools/:schoolId/attendances",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.ATTENDANCE),
	validateRequest(attendanceSchoolParamsSchema),
	getAttendancesController,
);

router.get(
	"/schools/:schoolId/attendances/:id",
	authenticate,
	authorize(
		UserRole.ADMIN,
		UserRole.MANAGER,
		UserRole.TEACHER,
		UserRole.GUARDIAN,
		UserRole.STUDENT,
	),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.ATTENDANCE),
	validateRequest(attendanceParamsSchema),
	getAttendanceByIdController,
);

router.patch(
	"/schools/:schoolId/attendances/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.ATTENDANCE),
	validateRequest(updateAttendanceSchema),
	updateAttendanceController,
);

router.delete(
	"/schools/:schoolId/attendances/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.ATTENDANCE),
	validateRequest(attendanceParamsSchema),
	deleteAttendanceController,
);

export const attendanceRoutes = router;
