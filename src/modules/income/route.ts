import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createOtherIncomeController,
	deleteOtherIncomeController,
	getIncomeMonthlyChartController,
	getIncomeSummaryController,
	updateOtherIncomeController,
} from "./controller.js";
import {
	createOtherIncomeSchema,
	deleteOtherIncomeSchema,
	incomeChartSchema,
	incomeSummarySchema,
	updateOtherIncomeSchema,
} from "./validation.js";

const router = Router();
const basePath = "/schools/:schoolId/income";
const staffGuard = [
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
];

const adminGuard = [
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
];

router.post(
	`${basePath}/other`,
	...staffGuard,
	validateRequest(createOtherIncomeSchema),
	createOtherIncomeController,
);

router.patch(
	`${basePath}/other/:id`,
	...staffGuard,
	validateRequest(updateOtherIncomeSchema),
	updateOtherIncomeController,
);

router.delete(
	`${basePath}/other/:id`,
	...adminGuard,
	validateRequest(deleteOtherIncomeSchema),
	deleteOtherIncomeController,
);

router.get(
	`${basePath}/summary`,
	...staffGuard,
	validateRequest(incomeSummarySchema),
	getIncomeSummaryController,
);

router.get(
	`${basePath}/chart`,
	...staffGuard,
	validateRequest(incomeChartSchema),
	getIncomeMonthlyChartController,
);

export const incomeRoutes = router;
