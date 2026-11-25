import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { requireSchoolAccess } from "../../middleware/schoolAccess.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	createManagerController,
	deleteManagerController,
	getManagerByIdController,
	getManagersController,
	updateManagerController,
} from "./controller.js";
import {
	createManagerSchema,
	managerParamsSchema,
	managerSchoolParamsSchema,
	updateManagerSchema,
} from "./validation.js";

const router = Router();

router.post(
	"/schools/:schoolId/managers",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(createManagerSchema),
	createManagerController,
);

router.get(
	"/schools/:schoolId/managers",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(managerSchoolParamsSchema),
	getManagersController,
);

router.get(
	"/schools/:schoolId/managers/:id",
	authenticate,
	authorize(UserRole.ADMIN, UserRole.MANAGER),
	requireSchoolAccess,
	validateRequest(managerParamsSchema),
	getManagerByIdController,
);

router.patch(
	"/schools/:schoolId/managers/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(updateManagerSchema),
	updateManagerController,
);

router.delete(
	"/schools/:schoolId/managers/:id",
	authenticate,
	authorize(UserRole.ADMIN),
	requireSchoolAccess,
	validateRequest(managerParamsSchema),
	deleteManagerController,
);

export const managerRoutes = router;
