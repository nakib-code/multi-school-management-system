import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middleware/auth.js";

import { UserRole } from "../../generated/prisma/client.js";

import {
  subscriptionController,
} from "./subscription.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  subscriptionController.createSubscription,
);

router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  subscriptionController.getAllSubscriptions,
);

router.get(
  "/school/:schoolId",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  subscriptionController.getSchoolSubscriptions,
);

router.get(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  subscriptionController.getSubscriptionById,
);

router.patch(
  "/:id",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  subscriptionController.updateSubscription,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(UserRole.SUPER_ADMIN),
  subscriptionController.updateSubscriptionStatus,
);

export const subscriptionRouter = router;