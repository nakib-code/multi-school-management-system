import { Router } from "express";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";

import { packageController } from "./package.controller.js";

const router = Router();

router.post(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	packageController.createPackage,
);

router.get("/public", packageController.getPublicPackages);

router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	packageController.getAllPackages,
);

router.get(
	"/:id",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	packageController.getPackageById,
);

router.patch(
	"/:id",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	packageController.updatePackage,
);

router.patch(
	"/:id/status",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	packageController.updatePackageStatus,
);

export const packageRouter = router;
