import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	getPendingSubscriptionPaymentsController,
	getSubscriptionPaymentHistoryController,
	getSubscriptionPaymentSummaryController,
	rejectSubscriptionPaymentController,
	submitManualSubscriptionPaymentController,
	verifySubscriptionPaymentController,
} from "./controller.js";
import {
	paymentIdParamsSchema,
	rejectSubscriptionPaymentSchema,
	submitSubscriptionPaymentSchema,
	subscriptionPaymentFilterQuerySchema,
} from "./validation.js";

const router = Router();

// ====================================================
// SCHOOL ADMIN - MANUAL bKash / Nagad / Rocket PAYMENT
// ====================================================

router.post(
	"/subscriptions/:subscriptionId/payments",
	authenticate,
	authorize(UserRole.ADMIN),
	validateRequest(submitSubscriptionPaymentSchema),
	submitManualSubscriptionPaymentController,
);

router.post(
	"/subscriptions/:subscriptionId/pay",
	authenticate,
	authorize(UserRole.ADMIN),
	validateRequest(submitSubscriptionPaymentSchema),
	submitManualSubscriptionPaymentController,
);

// ====================================================
// SUPER ADMIN - VERIFY / REJECT MANUAL PAYMENTS
// ====================================================

router.get(
	"/payments/subscription/pending",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	getPendingSubscriptionPaymentsController,
);

router.patch(
	"/payments/subscription/:paymentId/verify",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(paymentIdParamsSchema),
	verifySubscriptionPaymentController,
);

router.patch(
	"/payments/subscription/:paymentId/reject",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(rejectSubscriptionPaymentSchema),
	rejectSubscriptionPaymentController,
);

// ====================================================
// SUPER ADMIN - PAYMENT OVERVIEW
// ====================================================

router.get(
	"/payments/subscription/summary",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	getSubscriptionPaymentSummaryController,
);

router.get(
	"/payments/subscription/history",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	validateRequest(subscriptionPaymentFilterQuerySchema),
	getSubscriptionPaymentHistoryController,
);

export const subscriptionPaymentRoutes = router;
