import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";

import { subscriptionController } from "./subscription.controller.js";

const router = Router();

// Super Admin - Create Subscription
router.post(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	subscriptionController.createSubscription,
);

// Admin - Select Subscription Package
// IMPORTANT: Must be before "/:id"
router.post(
	"/select-package",
	authenticate,
	authorize(UserRole.ADMIN),
	subscriptionController.selectPackageForAdmin,
);

// Super Admin - Get All Subscriptions
router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	subscriptionController.getAllSubscriptions,
);

// Super Admin - Get School Subscriptions
router.get(
	"/school/:schoolId",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	subscriptionController.getSchoolSubscriptions,
);

// Admin - Get Own Current Subscription
// IMPORTANT: Must be before "/:id"
router.get(
	"/me",
	authenticate,
	authorize(UserRole.ADMIN),
	subscriptionController.getMySubscription,
);

// Super Admin - Get Subscription By ID
router.get(
	"/:id",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	subscriptionController.getSubscriptionById,
);

// Super Admin - Update Subscription
router.patch(
	"/:id",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	subscriptionController.updateSubscription,
);

// Super Admin - Update Subscription Status
router.patch(
	"/:id/status",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	subscriptionController.updateSubscriptionStatus,
);

export const subscriptionRouter = router;
