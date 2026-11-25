import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getPlatformSettingController,
	updatePlatformSettingController,
} from "./controller.js";
import { updatePlatformSettingSchema } from "./validation.js";

const router = Router();

router.get("/", getPlatformSettingController);

router.patch(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(updatePlatformSettingSchema),
	updatePlatformSettingController,
);

export const platformSettingRoutes = router;
