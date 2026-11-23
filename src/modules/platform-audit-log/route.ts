import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getPlatformAuditLogByIdController,
	getPlatformAuditLogsController,
} from "./controller.js";
import {
	getPlatformAuditLogsQuerySchema,
	platformAuditLogIdSchema,
} from "./validation.js";

const router = Router();

// Strictly SUPER_ADMIN only; immutable (read-only)
router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(getPlatformAuditLogsQuerySchema),
	getPlatformAuditLogsController,
);

router.get(
	"/:id",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(platformAuditLogIdSchema),
	getPlatformAuditLogByIdController,
);

export const platformAuditLogRoutes = router;
