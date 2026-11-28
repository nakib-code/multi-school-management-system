import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

import type {
	CreateSubscriptionPayload,
	SelectPackagePayload,
	UpdateSubscriptionPayload,
	UpdateSubscriptionStatusPayload,
} from "./subscription.types.js";

// ============================================
// Super Admin - Create Subscription
// ============================================

const createSubscription = async (payload: CreateSubscriptionPayload) => {
	const school = await prisma.school.findUnique({
		where: {
			id: payload.schoolId,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const packageData = await prisma.package.findUnique({
		where: {
			id: payload.packageId,
		},
	});

	if (!packageData) {
		throw new AppError(404, "Package not found");
	}

	if (!packageData.isActive) {
		throw new AppError(400, "Cannot assign an inactive package");
	}

	const existingActiveSubscription = await prisma.schoolSubscription.findFirst({
		where: {
			schoolId: payload.schoolId,
			status: "ACTIVE",
		},
	});

	if (existingActiveSubscription) {
		throw new AppError(409, "School already has an active subscription");
	}

	const subscription = await prisma.schoolSubscription.create({
		data: {
			schoolId: payload.schoolId,
			packageId: payload.packageId,
			startDate: payload.startDate,
			endDate: payload.endDate,
			price: payload.price,

			...(payload.notes !== undefined && {
				notes: payload.notes,
			}),

			status: "ACTIVE",
		},

		include: {
			school: {
				select: {
					id: true,
					name: true,
					code: true,
					status: true,
				},
			},
			package: true,
		},
	});

	return subscription;
};

// ============================================
// Admin - Select Package
// ============================================

const selectPackageForAdmin = async (
	schoolId: number,
	payload: SelectPackagePayload,
) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status !== "ACTIVE") {
		throw new AppError(
			400,
			"School must be approved before selecting a subscription package",
		);
	}

	const packageData = await prisma.package.findUnique({
		where: { id: payload.packageId },
	});

	if (!packageData) {
		throw new AppError(404, "Package not found");
	}

	if (!packageData.isActive) {
		throw new AppError(400, "Cannot select an inactive package");
	}

	return prisma.$transaction(async (tx) => {
		const activeSubscription = await tx.schoolSubscription.findFirst({
			where: {
				schoolId,
				status: "ACTIVE",
			},
			include: {
				school: {
					select: {
						id: true,
						name: true,
						code: true,
						status: true,
					},
				},
				package: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		// Renewing the same active package: reuse active subscription so payment extends endDate
		if (activeSubscription && activeSubscription.packageId === packageData.id) {
			return activeSubscription;
		}

		const pendingSubscription = await tx.schoolSubscription.findFirst({
			where: {
				schoolId,
				status: "PENDING",
			},
			include: {
				payments: {
					where: { status: "PENDING" },
					select: { id: true },
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		// Same package already selected as pending.
		if (
			pendingSubscription &&
			pendingSubscription.packageId === packageData.id
		) {
			return tx.schoolSubscription.findUniqueOrThrow({
				where: { id: pendingSubscription.id },
				include: {
					school: {
						select: {
							id: true,
							name: true,
							code: true,
							status: true,
						},
					},
					package: true,
				},
			});
		}

		if (pendingSubscription && pendingSubscription.payments.length > 0) {
			throw new AppError(
				409,
				"You already have a pending payment awaiting verification. Please wait for Super Admin review before switching packages.",
			);
		}

		// Cancel all previous pending selections atomically.
		if (pendingSubscription) {
			await tx.schoolSubscription.updateMany({
				where: {
					schoolId,
					status: "PENDING",
				},
				data: {
					status: "CANCELLED",
					notes: "Cancelled because another package was selected.",
				},
			});
		}

		const now = new Date();

		// Temporary dates for the pending subscription.
		// Actual subscription dates should be finalized
		// when payment becomes PAID/ACTIVE.
		const endDate = new Date(now);

		if (packageData.billingCycle === "MONTHLY") {
			endDate.setMonth(endDate.getMonth() + 1);
		} else {
			endDate.setFullYear(endDate.getFullYear() + 1);
		}

		return tx.schoolSubscription.create({
			data: {
				schoolId,
				packageId: packageData.id,
				startDate: now,
				endDate,
				price: packageData.price,
				status: "PENDING",
				notes: "Package selected. Payment pending.",
			},
			include: {
				school: {
					select: {
						id: true,
						name: true,
						code: true,
						status: true,
					},
				},
				package: true,
			},
		});
	});
};

// ============================================
// Get All Subscriptions
// ============================================

const getAllSubscriptions = async () => {
	return prisma.schoolSubscription.findMany({
		include: {
			school: {
				select: {
					id: true,
					name: true,
					code: true,
					status: true,
				},
			},
			package: true,
		},

		orderBy: {
			createdAt: "desc",
		},
	});
};

// ============================================
// Get Subscription By ID
// ============================================

const getSubscriptionById = async (id: number) => {
	const subscription = await prisma.schoolSubscription.findUnique({
		where: {
			id,
		},

		include: {
			school: {
				select: {
					id: true,
					name: true,
					code: true,
					status: true,
				},
			},
			package: true,
			payments: {
				orderBy: { createdAt: "desc" },
				include: {
					verifiedBy: {
						select: { id: true, name: true, role: true },
					},
				},
			},
		},
	});

	if (!subscription) {
		throw new AppError(404, "Subscription not found");
	}

	return {
		...subscription,
		payments: subscription.payments.map((p) => ({
			...p,
			paidAmount: Number(p.paidAmount),
		})),
	};
};

// ============================================
// Get School Subscriptions
// ============================================

const getSchoolSubscriptions = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	return prisma.schoolSubscription.findMany({
		where: {
			schoolId,
		},

		include: {
			package: true,
		},

		orderBy: {
			createdAt: "desc",
		},
	});
};

// ============================================
// Get My Subscription
// ============================================

/**
 * Get the latest subscription for the
 * logged-in Admin's school.
 *
 * Returns:
 * - null when the Admin has never selected a package
 * - PENDING when payment is pending
 * - ACTIVE when payment is completed
 * - CANCELLED when a previous subscription was cancelled
 * - EXPIRED when a subscription has expired
 */
const getMySubscription = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const [activeSub, latestSub, activeStudentsCount, recentPayments] =
		await Promise.all([
			prisma.schoolSubscription.findFirst({
				where: { schoolId, status: "ACTIVE" },
				include: { package: true },
				orderBy: { createdAt: "desc" },
			}),
			prisma.schoolSubscription.findFirst({
				where: { schoolId },
				include: { package: true },
				orderBy: { createdAt: "desc" },
			}),
			prisma.student.count({
				where: { schoolId, isActive: true },
			}),
			prisma.subscriptionPayment.findMany({
				where: { schoolId },
				include: {
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
				},
				orderBy: { createdAt: "desc" },
				take: 20,
			}),
		]);

	const primarySub = activeSub ?? latestSub;
	if (!primarySub) {
		return null;
	}

	const pendingUpgrade =
		activeSub &&
		latestSub &&
		latestSub.id !== activeSub.id &&
		latestSub.status === "PENDING"
			? latestSub
			: null;

	return {
		...primarySub,
		activeStudentsCount,
		pendingUpgrade,
		payments: recentPayments.map((payment) => ({
			id: payment.id,
			subscriptionId: payment.subscriptionId,
			paymentMethod: payment.paymentMethod,
			senderNumber: payment.senderNumber,
			receiverNumber: payment.receiverNumber,
			trxId: payment.trxId,
			paidAmount: Number(payment.paidAmount),
			currency: payment.currency,
			status: payment.status,
			paidAt: payment.paidAt,
			verifiedAt: payment.verifiedAt,
			rejectionReason: payment.rejectionReason,
			remarks: payment.remarks,
			createdAt: payment.createdAt,
			package: {
				id: payment.subscription.package.id,
				name: payment.subscription.package.name,
				price: Number(payment.subscription.package.price),
				billingCycle: payment.subscription.package.billingCycle,
			},
		})),
	};
};

const getMySubscriptionPayments = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
		select: { id: true },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const payments = await prisma.subscriptionPayment.findMany({
		where: { schoolId },
		include: {
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
				select: { id: true, name: true, role: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return payments.map((payment) => ({
		id: payment.id,
		subscriptionId: payment.subscriptionId,
		paymentMethod: payment.paymentMethod,
		senderNumber: payment.senderNumber,
		receiverNumber: payment.receiverNumber,
		trxId: payment.trxId,
		paidAmount: Number(payment.paidAmount),
		currency: payment.currency,
		status: payment.status,
		paidAt: payment.paidAt,
		verifiedAt: payment.verifiedAt,
		rejectionReason: payment.rejectionReason,
		remarks: payment.remarks,
		createdAt: payment.createdAt,
		verifiedBy: payment.verifiedBy,
		package: {
			id: payment.subscription.package.id,
			name: payment.subscription.package.name,
			price: Number(payment.subscription.package.price),
			billingCycle: payment.subscription.package.billingCycle,
		},
	}));
};

// ============================================
// Update Subscription
// ============================================

const updateSubscription = async (
	id: number,
	payload: UpdateSubscriptionPayload,
) => {
	const existingSubscription = await prisma.schoolSubscription.findUnique({
		where: {
			id,
		},
	});

	if (!existingSubscription) {
		throw new AppError(404, "Subscription not found");
	}

	const startDate = payload.startDate ?? existingSubscription.startDate;

	const endDate = payload.endDate ?? existingSubscription.endDate;

	if (endDate <= startDate) {
		throw new AppError(400, "End date must be after start date");
	}

	return prisma.schoolSubscription.update({
		where: {
			id,
		},

		data: {
			...(payload.startDate !== undefined && {
				startDate: payload.startDate,
			}),

			...(payload.endDate !== undefined && {
				endDate: payload.endDate,
			}),

			...(payload.price !== undefined && {
				price: payload.price,
			}),

			...(payload.notes !== undefined && {
				notes: payload.notes,
			}),
		},

		include: {
			school: {
				select: {
					id: true,
					name: true,
					code: true,
					status: true,
				},
			},
			package: true,
		},
	});
};

// ============================================
// Update Subscription Status
// ============================================

const updateSubscriptionStatus = async (
	id: number,
	payload: UpdateSubscriptionStatusPayload,
) => {
	return prisma.$transaction(async (tx) => {
		const existingSubscription = await tx.schoolSubscription.findUnique({
			where: {
				id,
			},
		});

		if (!existingSubscription) {
			throw new AppError(404, "Subscription not found");
		}

		if (payload.status === "ACTIVE") {
			await tx.schoolSubscription.updateMany({
				where: {
					schoolId: existingSubscription.schoolId,
					status: "ACTIVE",
					id: { not: id },
				},
				data: {
					status: "EXPIRED",
				},
			});
		}

		return tx.schoolSubscription.update({
			where: {
				id,
			},

			data: {
				status: payload.status,
			},

			include: {
				school: {
					select: {
						id: true,
						name: true,
						code: true,
						status: true,
					},
				},
				package: true,
			},
		});
	});
};

// ============================================
// Export
// ============================================

export const subscriptionService = {
	createSubscription,
	selectPackageForAdmin,
	getAllSubscriptions,
	getSubscriptionById,
	getSchoolSubscriptions,
	getMySubscription,
	getMySubscriptionPayments,
	updateSubscription,
	updateSubscriptionStatus,
};
