import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getUsersController,
	updateUserStatusController,
} from "./controller.js";
import { getUsersQuerySchema, updateUserStatusSchema } from "./validation.js";

const router = Router();

router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(getUsersQuerySchema),
	getUsersController,
);

router.patch(
	"/:id/status",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(updateUserStatusSchema),
	updateUserStatusController,
);

export const userRoutes = router;
