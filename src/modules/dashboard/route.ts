import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";

import { getDashboardController } from "./controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  getDashboardController,
);

export const dashboardRoutes = router;