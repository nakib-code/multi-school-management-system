import { Router } from "express";

import { UserRole } from "../../generated/prisma/client.js";

import { authenticate, authorize } from "../../middleware/auth.js";

import { validateRequest } from "../../middleware/validateRequest.js";

import {
	approveCashSubscriptionPaymentController,
	getPendingCashPaymentsController,
	getSubscriptionPaymentHistoryController,
	getSubscriptionPaymentSummaryController,
	initiateSubscriptionPaymentController,
	rejectCashSubscriptionPaymentController,
	requestCashSubscriptionPaymentController,
	subscriptionPaymentCancelController,
	subscriptionPaymentFailController,
	subscriptionPaymentIpnController,
	subscriptionPaymentSuccessController,
} from "./controller.js";

import { subscriptionIdParamsSchema } from "./validation.js";

const router = Router();

// ====================================================
// ADMIN - ONLINE SUBSCRIPTION PAYMENT
// ====================================================

router.post(
  "/subscriptions/:subscriptionId/pay",
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest(subscriptionIdParamsSchema),
  initiateSubscriptionPaymentController,
);

// ====================================================
// SSLCommerz CALLBACKS
// ====================================================

// IMPORTANT:
// These routes must NOT use authenticate/authorize.
// SSLCommerz calls these endpoints directly.

router.post(
	"/payments/subscription/success",
	subscriptionPaymentSuccessController,
);

router.post("/payments/subscription/fail", subscriptionPaymentFailController);

router.post(
	"/payments/subscription/cancel",
	subscriptionPaymentCancelController,
);

router.post("/payments/subscription/ipn", subscriptionPaymentIpnController);

// ====================================================
// ADMIN - CASH PAYMENT
// ====================================================

router.post(
	"/subscriptions/:subscriptionId/cash-payment",
	authenticate,
	authorize(UserRole.ADMIN),
	validateRequest(subscriptionIdParamsSchema),
	requestCashSubscriptionPaymentController,
);

// ====================================================
// SUPER ADMIN - CASH PAYMENT MANAGEMENT
// ====================================================

router.get(
	"/payments/subscription/cash/pending",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	getPendingCashPaymentsController,
);

router.patch(
	"/payments/subscription/cash/:paymentId/approve",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	approveCashSubscriptionPaymentController,
);

router.patch(
	"/payments/subscription/cash/:paymentId/reject",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	rejectCashSubscriptionPaymentController,
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
        getSubscriptionPaymentHistoryController,
);
export const subscriptionPaymentRoutes = router;
