import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";

import { getReportOverviewController } from "./controller.js";

const router = Router();

router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	getReportOverviewController,
);

export const reportRoutes = router;
