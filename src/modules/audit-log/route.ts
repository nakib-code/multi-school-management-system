import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
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
	validateRequest(createAuditLogSchema),
	createAuditLogController,
);

router.get(
	"/schools/:schoolId/audit-logs",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(auditLogSchoolParamsSchema),
	getAuditLogsController,
);

router.get(
	"/schools/:schoolId/audit-logs/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(auditLogParamsSchema),
	getAuditLogByIdController,
);

export const auditLogRoutes = router;
