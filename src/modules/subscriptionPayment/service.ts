import crypto from "node:crypto";

import { sslcommerz } from "../../config/sslcommerz.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

import type {
	InitiateSubscriptionPaymentResult,
	SubscriptionPaymentCallbackData,
} from "./interface.js";

// ====================================================
// Helpers
// ====================================================

const generateTransactionId = () => {
	return `SUB-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
};

const calculateEndDate = (startDate: Date, billingCycle: string) => {
	const endDate = new Date(startDate);

	if (billingCycle === "YEARLY") {
		endDate.setFullYear(endDate.getFullYear() + 1);
	} else {
		endDate.setMonth(endDate.getMonth() + 1);
	}

	return endDate;
};

// ====================================================
// ONLINE PAYMENT
// ====================================================

/**
 * Initiate Online Subscription Payment
 *
 * Admin can only pay for a PENDING subscription.
 */
export const initiateSubscriptionPayment = async (
	subscriptionId: number,
	schoolId: number,
) => {
	const subscription = await prisma.schoolSubscription.findFirst({
		where: {
			id: subscriptionId,
			schoolId,
		},

		include: {
			school: {
				select: {
					id: true,
					name: true,
					code: true,
					adminEmail: true,
					adminPhone: true,
					adminName: true,
				},
			},

			package: {
				select: {
					id: true,
					name: true,
					price: true,
					billingCycle: true,
					isActive: true,
				},
			},
		},
	});

	if (!subscription) {
		throw new AppError(404, "Subscription not found");
	}

	if (subscription.status === "ACTIVE") {
		throw new AppError(400, "This subscription is already active");
	}

	if (subscription.status !== "PENDING") {
		throw new AppError(400, "This subscription is not available for payment");
	}

	if (!subscription.package.isActive) {
		throw new AppError(400, "The selected package is no longer active");
	}

	const amount = Number(subscription.price);

	if (!Number.isFinite(amount) || amount <= 0) {
		throw new AppError(400, "Invalid subscription payment amount");
	}

	// --------------------------------------------------
	// Check pending online payment
	// --------------------------------------------------

	const existingPendingPayment = await prisma.subscriptionPayment.findFirst({
		where: {
			subscriptionId,
			schoolId,
			paymentMethod: "ONLINE",
			status: "PENDING",
		},

		orderBy: {
			createdAt: "desc",
		},
	});

	if (existingPendingPayment) {
		throw new AppError(
			400,
			"A payment is already pending for this subscription",
		);
	}

	const transactionId = generateTransactionId();

	// --------------------------------------------------
	// Create payment record
	// --------------------------------------------------

	const payment = await prisma.subscriptionPayment.create({
		data: {
			subscriptionId,
			schoolId,
			amount,
			currency: "BDT",
			status: "PENDING",
			paymentMethod: "ONLINE",
			transactionId,
		},
	});

	try {
		const baseUrl = process.env.BACKEND_URL || "http://localhost:5001";

		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

		const response = await sslcommerz.init({
			total_amount: amount,
			currency: "BDT",
			tran_id: transactionId,

			success_url: `${baseUrl}/api/v1/payments/subscription/success`,

			fail_url: `${baseUrl}/api/v1/payments/subscription/fail`,

			cancel_url: `${baseUrl}/api/v1/payments/subscription/cancel`,

			ipn_url: `${baseUrl}/api/v1/payments/subscription/ipn`,

			product_name: `${subscription.package.name} Subscription`,

			product_category: "Subscription",
			product_profile: "general",

			cus_name: subscription.school.adminName || subscription.school.name,

			cus_email: subscription.school.adminEmail || "admin@example.com",

			cus_phone: subscription.school.adminPhone || "N/A",

			cus_add1: subscription.school.name,
			cus_city: "Dhaka",
			cus_country: "Bangladesh",

			shipping_method: "NO",
			num_of_item: 1,

			value_a: String(payment.id),
			value_b: String(subscriptionId),
			value_c: String(schoolId),
			value_d: frontendUrl,
		});

		const gatewayResponse = response as {
			status?: string;
			GatewayPageURL?: string;
		};

		if (gatewayResponse.status && gatewayResponse.status !== "SUCCESS") {
			throw new AppError(502, "Failed to initialize SSLCommerz payment");
		}

		if (!gatewayResponse.GatewayPageURL) {
			throw new AppError(
				502,
				"SSLCommerz payment gateway URL was not returned",
			);
		}

		return {
			paymentId: payment.id,
			subscriptionId,
			transactionId,
			amount,
			currency: "BDT",
			paymentUrl: gatewayResponse.GatewayPageURL,
		} satisfies InitiateSubscriptionPaymentResult;
	} catch (error) {
		await prisma.subscriptionPayment.update({
			where: {
				id: payment.id,
			},

			data: {
				status: "FAILED",
				remarks: "SSLCommerz payment initialization failed.",
			},
		});

		throw error;
	}
};

// ====================================================
// CALLBACK DATA
// ====================================================

export const getSubscriptionPaymentCallbackData = (
	body: SubscriptionPaymentCallbackData,
): SubscriptionPaymentCallbackData => {
	return {
		...(body.status !== undefined && {
			status: body.status,
		}),

		...(body.tran_id !== undefined && {
			tran_id: body.tran_id,
		}),

		...(body.val_id !== undefined && {
			val_id: body.val_id,
		}),

		...(body.amount !== undefined && {
			amount: body.amount,
		}),

		...(body.currency !== undefined && {
			currency: body.currency,
		}),

		...(body.value_a !== undefined && {
			value_a: body.value_a,
		}),

		...(body.value_b !== undefined && {
			value_b: body.value_b,
		}),

		...(body.value_c !== undefined && {
			value_c: body.value_c,
		}),

		...(body.value_d !== undefined && {
			value_d: body.value_d,
		}),
	};
};

// ====================================================
// SUCCESSFUL ONLINE PAYMENT
// ====================================================

export const processSuccessfulSubscriptionPayment = async (
	callbackData: SubscriptionPaymentCallbackData,
) => {
	if (!callbackData.tran_id) {
		throw new AppError(400, "Transaction ID is missing");
	}

	if (!callbackData.val_id) {
		throw new AppError(400, "SSLCommerz validation ID is missing");
	}

	const payment = await prisma.subscriptionPayment.findUnique({
		where: {
			transactionId: callbackData.tran_id,
		},

		include: {
			subscription: {
				include: {
					package: true,
				},
			},
		},
	});

	if (!payment) {
		throw new AppError(404, "Subscription payment not found");
	}

	// --------------------------------------------------
	// Idempotency
	// --------------------------------------------------

	if (payment.status === "PAID") {
		return payment;
	}

	if (payment.status === "CANCELLED") {
		throw new AppError(400, "This payment has already been cancelled");
	}

	if (payment.paymentMethod !== "ONLINE") {
		throw new AppError(400, "Invalid payment method");
	}

	// --------------------------------------------------
	// Validate payment with SSLCommerz
	// --------------------------------------------------

	const validationResponse = await sslcommerz.validate({
		val_id: callbackData.val_id,
	});

	const validation = validationResponse as {
		status?: string;
		tran_id?: string;
		val_id?: string;
		amount?: string;
		currency?: string;
	};

	if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
		throw new AppError(400, "SSLCommerz payment validation failed");
	}

	if (validation.tran_id !== payment.transactionId) {
		throw new AppError(400, "Transaction ID verification failed");
	}

	const gatewayAmount = Number(validation.amount);

	if (
		!Number.isFinite(gatewayAmount) ||
		gatewayAmount !== Number(payment.amount)
	) {
		throw new AppError(400, "Payment amount verification failed");
	}

	if (validation.currency !== payment.currency) {
		throw new AppError(400, "Payment currency verification failed");
	}

	const paidAt = new Date();

	// --------------------------------------------------
	// Mark payment PAID + activate subscription
	// --------------------------------------------------

	const result = await prisma.$transaction(async (tx) => {
		const currentPayment = await tx.subscriptionPayment.findUnique({
			where: {
				id: payment.id,
			},
		});

		if (!currentPayment) {
			throw new AppError(404, "Subscription payment not found");
		}

		if (currentPayment.status === "PAID") {
			return currentPayment;
		}

		if (currentPayment.status === "CANCELLED") {
			throw new AppError(400, "This payment has already been cancelled");
		}

		const subscription = await tx.schoolSubscription.findUnique({
			where: {
				id: currentPayment.subscriptionId,
			},

			include: {
				package: true,
				school: {
					select: {
						id: true,
						status: true,
					},
				},
			},
		});

		if (!subscription) {
			throw new AppError(404, "Subscription not found");
		}

		if (subscription.school.status !== "ACTIVE") {
			throw new AppError(400, "School is not active");
		}

		if (subscription.status !== "PENDING") {
			throw new AppError(400, "Subscription is not pending");
		}

		if (!subscription.package.isActive) {
			throw new AppError(400, "The selected package is no longer active");
		}

		// Recalculate dates from actual payment time.
		const startDate = paidAt;

		const endDate = calculateEndDate(
			startDate,
			subscription.package.billingCycle,
		);
		if (!validation.val_id) {
			throw new AppError(400, "SSLCommerz validation ID is missing");
		}

		if (!validation.currency) {
			throw new AppError(400, "SSLCommerz validation currency is missing");
		}
		const updatedPayment = await tx.subscriptionPayment.update({
			where: {
				id: currentPayment.id,
			},

			data: {
				status: "PAID",
				validationId: validation.val_id,
				gatewayAmount,
				gatewayCurrency: validation.currency,
				paidAt,
			},
		});

		await tx.schoolSubscription.update({
			where: {
				id: subscription.id,
			},

			data: {
				status: "ACTIVE",
				startDate,
				endDate,

				// Use server-side payment amount.
				price: currentPayment.amount,

				notes: "Subscription activated after successful SSLCommerz payment.",
			},
		});

		return updatedPayment;
	});

	return result;
};

// ====================================================
// FAILED ONLINE PAYMENT
// ====================================================

export const processFailedSubscriptionPayment = async (
	callbackData: SubscriptionPaymentCallbackData,
) => {
	if (!callbackData.tran_id) {
		throw new AppError(400, "Transaction ID is missing");
	}

	const payment = await prisma.subscriptionPayment.findUnique({
		where: {
			transactionId: callbackData.tran_id,
		},
	});

	if (!payment) {
		throw new AppError(404, "Subscription payment not found");
	}

	if (payment.status === "PAID") {
		return payment;
	}

	if (payment.status === "CANCELLED") {
		return payment;
	}

	return prisma.subscriptionPayment.update({
		where: {
			id: payment.id,
		},

		data: {
			status: "FAILED",
			remarks: "SSLCommerz payment failed.",
		},
	});
};

// ====================================================
// CANCELLED ONLINE PAYMENT
// ====================================================

export const processCancelledSubscriptionPayment = async (
	callbackData: SubscriptionPaymentCallbackData,
) => {
	if (!callbackData.tran_id) {
		throw new AppError(400, "Transaction ID is missing");
	}

	const payment = await prisma.subscriptionPayment.findUnique({
		where: {
			transactionId: callbackData.tran_id,
		},
	});

	if (!payment) {
		throw new AppError(404, "Subscription payment not found");
	}

	if (payment.status === "PAID") {
		return payment;
	}

	if (payment.status === "CANCELLED") {
		return payment;
	}

	return prisma.subscriptionPayment.update({
		where: {
			id: payment.id,
		},

		data: {
			status: "CANCELLED",
			remarks: "SSLCommerz payment cancelled.",
		},
	});
};

// ====================================================
// CASH PAYMENT
// ====================================================

/**
 * Admin - Request Cash Payment
 */
export const requestCashSubscriptionPayment = async (
	subscriptionId: number,
	schoolId: number,
) => {
	const subscription = await prisma.schoolSubscription.findFirst({
		where: {
			id: subscriptionId,
			schoolId,
		},

		include: {
			package: {
				select: {
					id: true,
					name: true,
					price: true,
					billingCycle: true,
					isActive: true,
				},
			},
		},
	});

	if (!subscription) {
		throw new AppError(404, "Subscription not found");
	}

	if (subscription.status === "ACTIVE") {
		throw new AppError(400, "This subscription is already active");
	}

	if (subscription.status !== "PENDING") {
		throw new AppError(400, "This subscription is not available for payment");
	}

	if (!subscription.package.isActive) {
		throw new AppError(400, "The selected package is no longer active");
	}

	const amount = Number(subscription.price);

	if (!Number.isFinite(amount) || amount <= 0) {
		throw new AppError(400, "Invalid subscription payment amount");
	}

	// --------------------------------------------------
	// Check pending cash payment
	// --------------------------------------------------

	const existingPendingPayment = await prisma.subscriptionPayment.findFirst({
		where: {
			subscriptionId,
			schoolId,
			paymentMethod: "CASH",
			status: "PENDING",
		},

		orderBy: {
			createdAt: "desc",
		},
	});

	if (existingPendingPayment) {
		throw new AppError(
			400,
			"A cash payment request is already pending for this subscription",
		);
	}

	const payment = await prisma.subscriptionPayment.create({
		data: {
			subscriptionId,
			schoolId,
			amount,
			currency: "BDT",
			status: "PENDING",
			paymentMethod: "CASH",
			remarks: "Cash payment request submitted by school admin.",
		},
	});

	return {
		paymentId: payment.id,
		subscriptionId: payment.subscriptionId,
		schoolId: payment.schoolId,
		amount: Number(payment.amount),
		currency: payment.currency,
		status: payment.status,
		paymentMethod: payment.paymentMethod,

		package: {
			id: subscription.package.id,
			name: subscription.package.name,
			price: Number(subscription.package.price),
			billingCycle: subscription.package.billingCycle,
		},

		createdAt: payment.createdAt,
	};
};

// ====================================================
// SUPER ADMIN - PENDING CASH PAYMENTS
// ====================================================

export const getPendingCashPayments = async () => {
	return prisma.subscriptionPayment.findMany({
		where: {
			paymentMethod: "CASH",
			status: "PENDING",
		},

		include: {
			school: {
				select: {
					id: true,
					name: true,
					code: true,
					adminName: true,
					adminEmail: true,
					adminPhone: true,
				},
			},

			subscription: {
				include: {
					package: {
						select: {
							id: true,
							name: true,
							price: true,
							billingCycle: true,
						},
					},
				},
			},
		},

		orderBy: {
			createdAt: "desc",
		},
	});
};

// ====================================================
// SUPER ADMIN - APPROVE CASH PAYMENT
// ====================================================

export const approveCashSubscriptionPayment = async (
	paymentId: number,
	remarks?: string,
) => {
	const payment = await prisma.subscriptionPayment.findUnique({
		where: {
			id: paymentId,
		},

		include: {
			subscription: {
				include: {
					package: true,
				},
			},
		},
	});

	if (!payment) {
		throw new AppError(404, "Payment not found");
	}

	if (payment.paymentMethod !== "CASH") {
		throw new AppError(
			400,
			"Only cash payments can be approved using this action",
		);
	}

	if (payment.status === "PAID") {
		return payment;
	}

	if (payment.status === "CANCELLED") {
		throw new AppError(
			400,
			"This cash payment request has already been rejected",
		);
	}

	const paidAt = new Date();

	const result = await prisma.$transaction(async (tx) => {
		const currentPayment = await tx.subscriptionPayment.findUnique({
			where: {
				id: paymentId,
			},
		});

		if (!currentPayment) {
			throw new AppError(404, "Payment not found");
		}

		if (currentPayment.status === "PAID") {
			return currentPayment;
		}

		if (currentPayment.status === "CANCELLED") {
			throw new AppError(
				400,
				"This cash payment request has already been rejected",
			);
		}

		const subscription = await tx.schoolSubscription.findUnique({
			where: {
				id: currentPayment.subscriptionId,
			},

			include: {
				package: true,
				school: {
					select: {
						id: true,
						status: true,
					},
				},
			},
		});

		if (!subscription) {
			throw new AppError(404, "Subscription not found");
		}

		if (subscription.school.id !== currentPayment.schoolId) {
			throw new AppError(400, "Payment and subscription school do not match");
		}

		if (subscription.school.status !== "ACTIVE") {
			throw new AppError(400, "School is not active");
		}

		if (subscription.status !== "PENDING") {
			throw new AppError(400, "Subscription is not pending");
		}

		if (!subscription.package.isActive) {
			throw new AppError(400, "The selected package is no longer active");
		}

		const startDate = paidAt;

		const endDate = calculateEndDate(
			startDate,
			subscription.package.billingCycle,
		);

		const updatedPayment = await tx.subscriptionPayment.update({
			where: {
				id: currentPayment.id,
			},

			data: {
				status: "PAID",
				paidAt,

				remarks: remarks?.trim() || "Cash payment approved by Super Admin.",
			},
		});

		await tx.schoolSubscription.update({
			where: {
				id: subscription.id,
			},

			data: {
				status: "ACTIVE",
				startDate,
				endDate,
				price: currentPayment.amount,

				notes: "Subscription activated after cash payment approval.",
			},
		});

		return updatedPayment;
	});

	return result;
};

// ====================================================
// SUPER ADMIN - REJECT CASH PAYMENT
// ====================================================

export const rejectCashSubscriptionPayment = async (
	paymentId: number,
	remarks?: string,
) => {
	const payment = await prisma.subscriptionPayment.findUnique({
		where: {
			id: paymentId,
		},
	});

	if (!payment) {
		throw new AppError(404, "Payment not found");
	}

	if (payment.paymentMethod !== "CASH") {
		throw new AppError(
			400,
			"Only cash payments can be rejected using this action",
		);
	}

	if (payment.status === "PAID") {
		throw new AppError(400, "A paid payment cannot be rejected");
	}

	if (payment.status === "CANCELLED") {
		return payment;
	}

	return prisma.subscriptionPayment.update({
		where: {
			id: payment.id,
		},

		data: {
			status: "CANCELLED",

			remarks:
				remarks?.trim() || "Cash payment request rejected by Super Admin.",
		},
	});
};
