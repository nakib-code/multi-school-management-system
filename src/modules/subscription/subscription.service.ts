import { prisma } from "../../lib/prisma.js";

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
		throw new Error("School not found");
	}

	const packageData = await prisma.package.findUnique({
		where: {
			id: payload.packageId,
		},

		include: {
			features: true,
		},
	});

	if (!packageData) {
		throw new Error("Package not found");
	}

	if (!packageData.isActive) {
		throw new Error("Cannot assign an inactive package");
	}

	const existingActiveSubscription = await prisma.schoolSubscription.findFirst({
		where: {
			schoolId: payload.schoolId,
			status: "ACTIVE",
		},
	});

	if (existingActiveSubscription) {
		throw new Error("School already has an active subscription");
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

			package: {
				include: {
					features: true,
				},
			},
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
		throw new Error("School not found");
	}

	if (school.status !== "ACTIVE") {
		throw new Error(
			"School must be approved before selecting a subscription package",
		);
	}

	const packageData = await prisma.package.findUnique({
		where: { id: payload.packageId },
		include: {
			features: true,
		},
	});

	if (!packageData) {
		throw new Error("Package not found");
	}

	if (!packageData.isActive) {
		throw new Error("Cannot select an inactive package");
	}

	if (packageData.isCustom) {
		throw new Error("Custom packages must be configured separately");
	}

	const activeSubscription = await prisma.schoolSubscription.findFirst({
		where: {
			schoolId,
			status: "ACTIVE",
		},
	});

	if (activeSubscription) {
		throw new Error("School already has an active subscription");
	}

	const pendingSubscription = await prisma.schoolSubscription.findFirst({
		where: {
			schoolId,
			status: "PENDING",
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	// Same package already selected.
	if (pendingSubscription && pendingSubscription.packageId === packageData.id) {
		return pendingSubscription;
	}

	// Cancel previous pending selection.
	if (pendingSubscription) {
		await prisma.schoolSubscription.update({
			where: {
				id: pendingSubscription.id,
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

	const subscription = await prisma.schoolSubscription.create({
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
			package: {
				include: {
					features: true,
				},
			},
		},
	});

	return subscription;
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

			package: {
				include: {
					features: true,
				},
			},
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

			package: {
				include: {
					features: true,
				},
			},
		},
	});

	if (!subscription) {
		throw new Error("Subscription not found");
	}

	return subscription;
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
		throw new Error("School not found");
	}

	return prisma.schoolSubscription.findMany({
		where: {
			schoolId,
		},

		include: {
			package: {
				include: {
					features: true,
				},
			},
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
		throw new Error("School not found");
	}

	return prisma.schoolSubscription.findFirst({
		where: {
			schoolId,
		},

		include: {
			package: {
				include: {
					features: true,
				},
			},
		},

		orderBy: {
			createdAt: "desc",
		},
	});
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
		throw new Error("Subscription not found");
	}

	const startDate = payload.startDate ?? existingSubscription.startDate;

	const endDate = payload.endDate ?? existingSubscription.endDate;

	if (endDate <= startDate) {
		throw new Error("End date must be after start date");
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

			package: {
				include: {
					features: true,
				},
			},
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
	const existingSubscription = await prisma.schoolSubscription.findUnique({
		where: {
			id,
		},
	});

	if (!existingSubscription) {
		throw new Error("Subscription not found");
	}

	return prisma.schoolSubscription.update({
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

			package: {
				include: {
					features: true,
				},
			},
		},
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
	updateSubscription,
	updateSubscriptionStatus,
};
