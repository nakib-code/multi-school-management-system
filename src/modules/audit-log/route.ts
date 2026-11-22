import { Router } from "express";

import { PackageFeature, UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requirePackageFeature } from "../../middleware/packageFeature.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createAuditLogController,
	getAuditLogByIdController,
	getAuditLogsController,
} from "./controller.js";
import {
	auditLogParamsSchema,
	auditLogSchoolParamsSchema,
	createAuditLogSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/audit-logs",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SCHOOL_MANAGEMENT),
	validateRequest(createAuditLogSchema),
	createAuditLogController,
);

router.get(
	"/schools/:schoolId/audit-logs",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SCHOOL_MANAGEMENT),
	validateRequest(auditLogSchoolParamsSchema),
	getAuditLogsController,
);

router.get(
	"/schools/:schoolId/audit-logs/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	requirePackageFeature(PackageFeature.SCHOOL_MANAGEMENT),
	validateRequest(auditLogParamsSchema),
	getAuditLogByIdController,
);

export const auditLogRoutes = router;
