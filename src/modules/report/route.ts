import { Router } from "express";

import { authenticate, authorize } from "../../middleware/auth.js";
import { UserRole } from "../../generated/prisma/client.js";

import { getReportOverviewController } from "./controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  getReportOverviewController,
);

export const reportRoutes = router;
