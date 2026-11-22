import {
	BillingCycle,
	SubscriptionPaymentMethod,
	SubscriptionPaymentStatus,
	SubscriptionStatus,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	normalizeTrxId,
	resolvePlatformReceiverNumber,
} from "../payment/service.js";
import type {
	RejectSubscriptionPaymentInput,
	SubmitSubscriptionPaymentInput,
	SubscriptionPaymentFilterQuery,
	SubscriptionPaymentSummary,
} from "./interface.js";

const subscriptionPaymentInclude = {
	school: {
		select: {
			id: true,
			name: true,
			code: true,
			email: true,
		},
	},
	subscription: {
		select: {
			id: true,
			status: true,
			startDate: true,
			endDate: true,
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
	verifiedBy: {
		select: {
			id: true,
			name: true,
			role: true,
		},
	},
};

const calculateSubscriptionEndDate = (
	startDate: Date,
	billingCycle: BillingCycle,
): Date => {
	const endDate = new Date(startDate);
	if (billingCycle === BillingCycle.YEARLY) {
		endDate.setFullYear(endDate.getFullYear() + 1);
	} else {
		endDate.setMonth(endDate.getMonth() + 1);
	}
	return endDate;
};

/* ---------- School Admin: Submit Manual Subscription Payment ---------- */

export const submitManualSubscriptionPayment = async (
	subscriptionId: number,
	schoolId: number,
	payload: SubmitSubscriptionPaymentInput,
) => {
	const subscription = await prisma.schoolSubscription.findFirst({
		where: {
			id: subscriptionId,
			schoolId,
		},
		include: {
			package: true,
		},
	});

	if (!subscription) {
		throw new AppError(404, "Subscription not found for your school");
	}

	if (subscription.status === SubscriptionStatus.CANCELLED) {
		throw new AppError(400, "Cannot pay for a cancelled subscription");
	}

	const normalizedTrxId = normalizeTrxId(payload.trxId);

	const duplicateTrx = await prisma.subscriptionPayment.findUnique({
		where: { trxId: normalizedTrxId },
	});
	if (duplicateTrx) {
		throw new AppError(
			409,
			"This transaction ID (trxId) has already been submitted",
		);
	}

	const existingPending = await prisma.subscriptionPayment.findFirst({
		where: {
			subscriptionId,
			status: SubscriptionPaymentStatus.PENDING,
		},
	});
	if (existingPending) {
		throw new AppError(
			409,
			"A pending payment already exists for this subscription. Please wait for verification.",
		);
	}

	const receiverNumber = resolvePlatformReceiverNumber(
		payload.paymentMethod,
		payload.receiverNumber,
	);

	const payment = await prisma.subscriptionPayment.create({
		data: {
			subscriptionId,
			schoolId,
			paymentMethod: payload.paymentMethod,
			senderNumber: payload.senderNumber.trim(),
			...(receiverNumber !== undefined ? { receiverNumber } : {}),
			trxId: normalizedTrxId,
			paidAmount: payload.paidAmount,
			currency: "BDT",
			status: SubscriptionPaymentStatus.PENDING,
			...(payload.paidAt !== undefined ? { paidAt: payload.paidAt } : {}),
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		include: subscriptionPaymentInclude,
	});

	return {
		...payment,
		paidAmount: Number(payment.paidAmount),
	};
};

/* ---------- Super Admin: List Pending Payments ---------- */

export const getPendingSubscriptionPayments = async () => {
	const payments = await prisma.subscriptionPayment.findMany({
		where: {
			status: SubscriptionPaymentStatus.PENDING,
		},
		include: subscriptionPaymentInclude,
		orderBy: { createdAt: "asc" },
	});

	return payments.map((payment) => ({
		...payment,
		paidAmount: Number(payment.paidAmount),
	}));
};

/* ---------- Super Admin: Verify Payment & Activate/Renew Subscription ---------- */

export const verifySubscriptionPayment = async (
	paymentId: number,
	verifierUserId: number,
) => {
	const payment = await prisma.subscriptionPayment.findUnique({
		where: { id: paymentId },
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

	if (payment.status === SubscriptionPaymentStatus.VERIFIED) {
		throw new AppError(400, "Subscription payment is already verified");
	}

	if (payment.status !== SubscriptionPaymentStatus.PENDING) {
		throw new AppError(
			400,
			"Only pending subscription payments can be verified",
		);
	}

	const now = new Date();
	const currentSub = payment.subscription;

	// If renewing an active subscription whose endDate is still in the future, extend from endDate
	const baseStartDate =
		currentSub.status === SubscriptionStatus.ACTIVE && currentSub.endDate > now
			? currentSub.endDate
			: now;

	const nextStartDate =
		currentSub.status === SubscriptionStatus.ACTIVE && currentSub.endDate > now
			? currentSub.startDate
			: now;

	const nextEndDate = calculateSubscriptionEndDate(
		baseStartDate,
		currentSub.package.billingCycle,
	);

	return prisma.$transaction(async (tx) => {
		// Expire any other currently active subscriptions for the same school
		await tx.schoolSubscription.updateMany({
			where: {
				schoolId: payment.schoolId,
				status: SubscriptionStatus.ACTIVE,
				id: { not: payment.subscriptionId },
			},
			data: {
				status: SubscriptionStatus.EXPIRED,
			},
		});

		const updatedPayment = await tx.subscriptionPayment.update({
			where: { id: paymentId },
			data: {
				status: SubscriptionPaymentStatus.VERIFIED,
				verifiedById: verifierUserId,
				verifiedAt: now,
				rejectionReason: null,
			},
			include: subscriptionPaymentInclude,
		});

		const updatedSubscription = await tx.schoolSubscription.update({
			where: { id: payment.subscriptionId },
			data: {
				status: SubscriptionStatus.ACTIVE,
				startDate: nextStartDate,
				endDate: nextEndDate,
				notes: `Activated/renewed after manual ${payment.paymentMethod} payment verification (TrxID: ${payment.trxId}).`,
			},
		});

		return {
			payment: {
				...updatedPayment,
				paidAmount: Number(updatedPayment.paidAmount),
			},
			subscription: updatedSubscription,
		};
	});
};

/* ---------- Super Admin: Reject Payment ---------- */

export const rejectSubscriptionPayment = async (
	paymentId: number,
	verifierUserId: number,
	payload: RejectSubscriptionPaymentInput,
) => {
	const payment = await prisma.subscriptionPayment.findUnique({
		where: { id: paymentId },
	});

	if (!payment) {
		throw new AppError(404, "Subscription payment not found");
	}

	if (payment.status === SubscriptionPaymentStatus.VERIFIED) {
		throw new AppError(
			400,
			"Verified subscription payments cannot be rejected",
		);
	}

	if (payment.status !== SubscriptionPaymentStatus.PENDING) {
		throw new AppError(
			400,
			"Only pending subscription payments can be rejected",
		);
	}

	const updated = await prisma.subscriptionPayment.update({
		where: { id: paymentId },
		data: {
			status: SubscriptionPaymentStatus.REJECTED,
			verifiedById: verifierUserId,
			verifiedAt: new Date(),
			rejectionReason: payload.rejectionReason.trim(),
		},
		include: subscriptionPaymentInclude,
	});

	return {
		...updated,
		paidAmount: Number(updated.paidAmount),
	};
};

/* ---------- Super Admin: Summary & History ---------- */

export const getSubscriptionPaymentSummary =
	async (): Promise<SubscriptionPaymentSummary> => {
		const [
			totalPayments,
			verifiedPayments,
			pendingPayments,
			rejectedPayments,
			verifiedAgg,
			bkashAgg,
			nagadAgg,
			rocketAgg,
			pendingAgg,
		] = await Promise.all([
			prisma.subscriptionPayment.count(),
			prisma.subscriptionPayment.count({
				where: { status: SubscriptionPaymentStatus.VERIFIED },
			}),
			prisma.subscriptionPayment.count({
				where: { status: SubscriptionPaymentStatus.PENDING },
			}),
			prisma.subscriptionPayment.count({
				where: { status: SubscriptionPaymentStatus.REJECTED },
			}),
			prisma.subscriptionPayment.aggregate({
				_sum: { paidAmount: true },
				where: { status: SubscriptionPaymentStatus.VERIFIED },
			}),
			prisma.subscriptionPayment.aggregate({
				_sum: { paidAmount: true },
				where: {
					status: SubscriptionPaymentStatus.VERIFIED,
					paymentMethod: SubscriptionPaymentMethod.BKASH,
				},
			}),
			prisma.subscriptionPayment.aggregate({
				_sum: { paidAmount: true },
				where: {
					status: SubscriptionPaymentStatus.VERIFIED,
					paymentMethod: SubscriptionPaymentMethod.NAGAD,
				},
			}),
			prisma.subscriptionPayment.aggregate({
				_sum: { paidAmount: true },
				where: {
					status: SubscriptionPaymentStatus.VERIFIED,
					paymentMethod: SubscriptionPaymentMethod.ROCKET,
				},
			}),
			prisma.subscriptionPayment.aggregate({
				_sum: { paidAmount: true },
				where: { status: SubscriptionPaymentStatus.PENDING },
			}),
		]);

		return {
			totalRevenue: Number(verifiedAgg._sum.paidAmount ?? 0),
			bkashRevenue: Number(bkashAgg._sum.paidAmount ?? 0),
			nagadRevenue: Number(nagadAgg._sum.paidAmount ?? 0),
			rocketRevenue: Number(rocketAgg._sum.paidAmount ?? 0),
			pendingAmount: Number(pendingAgg._sum.paidAmount ?? 0),
			totalPayments,
			verifiedPayments,
			pendingPayments,
			rejectedPayments,
		};
	};

export const getSubscriptionPaymentHistory = async (
	query: SubscriptionPaymentFilterQuery = {},
) => {
	const payments = await prisma.subscriptionPayment.findMany({
		where: {
			...(query.schoolId !== undefined ? { schoolId: query.schoolId } : {}),
			...(query.subscriptionId !== undefined
				? { subscriptionId: query.subscriptionId }
				: {}),
			...(query.paymentMethod !== undefined
				? { paymentMethod: query.paymentMethod }
				: {}),
			...(query.status !== undefined ? { status: query.status } : {}),
		},
		include: subscriptionPaymentInclude,
		orderBy: { createdAt: "desc" },
	});

	return payments.map((payment) => ({
		id: payment.id,
		subscriptionId: payment.subscriptionId,
		schoolId: payment.schoolId,
		paymentMethod: payment.paymentMethod,
		senderNumber: payment.senderNumber,
		receiverNumber: payment.receiverNumber,
		trxId: payment.trxId,
		paidAmount: Number(payment.paidAmount),
		currency: payment.currency,
		status: payment.status,
		paidAt: payment.paidAt,
		verifiedById: payment.verifiedById,
		verifiedAt: payment.verifiedAt,
		rejectionReason: payment.rejectionReason,
		remarks: payment.remarks,
		createdAt: payment.createdAt,
		school: payment.school,
		verifiedBy: payment.verifiedBy,
		subscription: {
			id: payment.subscription.id,
			status: payment.subscription.status,
			package: {
				id: payment.subscription.package.id,
				name: payment.subscription.package.name,
				price: Number(payment.subscription.package.price),
				billingCycle: payment.subscription.package.billingCycle,
			},
		},
	}));
};
