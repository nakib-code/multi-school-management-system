import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";

import {
	getAdmissionChartReportController,
	getDefaulterListReportController,
	getFeeChartReportController,
	getMonthlyNetReportController,
	getReportOverviewController,
	getSchoolReportOverviewController,
	getStudentRosterChartReportController,
} from "./controller.js";
import {
	admissionChartQuerySchema,
	defaulterListQuerySchema,
	feeChartQuerySchema,
	monthlyNetQuerySchema,
	rosterChartQuerySchema,
} from "./validation.js";

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

schoolRouter.get(
	"/schools/:schoolId/reports/charts/admissions",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(admissionChartQuerySchema),
	getAdmissionChartReportController,
);

schoolRouter.get(
	"/schools/:schoolId/reports/charts/fees",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(feeChartQuerySchema),
	getFeeChartReportController,
);

schoolRouter.get(
	"/schools/:schoolId/reports/charts/roster",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(rosterChartQuerySchema),
	getStudentRosterChartReportController,
);

schoolRouter.get(
	"/schools/:schoolId/reports/monthly-net",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(monthlyNetQuerySchema),
	getMonthlyNetReportController,
);

schoolRouter.get(
	"/schools/:schoolId/reports/defaulters",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(defaulterListQuerySchema),
	getDefaulterListReportController,
);

export const reportRoutes = router;
export const schoolReportRoutes = schoolRouter;
