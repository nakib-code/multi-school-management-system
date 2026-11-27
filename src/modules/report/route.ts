import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";

import {
	getReportOverviewController,
	getSchoolReportOverviewController,
} from "./controller.js";

const router = Router();

router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	getReportOverviewController,
);

const schoolRouter = Router();

schoolRouter.get(
	"/schools/:schoolId/reports/overview",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	getSchoolReportOverviewController,
);

export const reportRoutes = router;
export const schoolReportRoutes = schoolRouter;
