import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createEntryController,
	createSheetController,
	deleteEntryController,
	deleteSheetController,
	getMonthlyChartController,
	listEntriesController,
	listSheetsController,
	restoreSheetController,
	updateEntryController,
	updateSheetFieldsController,
} from "./controller.js";
import {
	createEntrySchema,
	createSheetSchema,
	deleteEntrySchema,
	deleteSheetSchema,
	listEntriesSchema,
	listSheetsSchema,
	monthlyChartSchema,
	restoreSheetSchema,
	updateEntrySchema,
	updateSheetFieldsSchema,
} from "./validation.js";

const router = Router();
const basePath = "/schools/:schoolId/custom-expenses";
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

router.get(
	`${basePath}/sheets`,
	...staffGuard,
	validateRequest(listSheetsSchema),
	listSheetsController,
);

router.post(
	`${basePath}/sheets`,
	...staffGuard,
	validateRequest(createSheetSchema),
	createSheetController,
);

router.patch(
	`${basePath}/sheets/:sheetId/fields`,
	...staffGuard,
	validateRequest(updateSheetFieldsSchema),
	updateSheetFieldsController,
);

router.patch(
	`${basePath}/sheets/:sheetId/restore`,
	...adminGuard,
	validateRequest(restoreSheetSchema),
	restoreSheetController,
);

router.delete(
	`${basePath}/sheets/:sheetId`,
	...adminGuard,
	validateRequest(deleteSheetSchema),
	deleteSheetController,
);

router.get(
	`${basePath}/sheets/:sheetId/entries`,
	...staffGuard,
	validateRequest(listEntriesSchema),
	listEntriesController,
);

router.post(
	`${basePath}/sheets/:sheetId/entries`,
	...staffGuard,
	validateRequest(createEntrySchema),
	createEntryController,
);

router.patch(
	`${basePath}/sheets/:sheetId/entries/:entryId`,
	...staffGuard,
	validateRequest(updateEntrySchema),
	updateEntryController,
);

router.delete(
	`${basePath}/sheets/:sheetId/entries/:entryId`,
	...adminGuard,
	validateRequest(deleteEntrySchema),
	deleteEntryController,
);

router.get(
	`${basePath}/sheets/:sheetId/chart`,
	...staffGuard,
	validateRequest(monthlyChartSchema),
	getMonthlyChartController,
);

export const customExpenseRoutes = router;
