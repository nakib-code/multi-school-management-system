import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

import type {
	CreateCustomPackageRequestPayload,
	GetCustomPackageRequestsQuery,
	ReviewCustomPackageRequestPayload,
} from "./customPackageRequest.types.js";

export const createCustomPackageRequest = async (
	payload: CreateCustomPackageRequestPayload,
) => {
	// ------------------------------------------------
	// Check school
	// ------------------------------------------------

	const school = await prisma.school.findUnique({
		where: {
			id: payload.schoolId,
		},

		select: {
			id: true,
			name: true,
			code: true,
			status: true,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status !== "ACTIVE") {
		throw new AppError(400, "Only active schools can request a custom package");
	}

	// ------------------------------------------------
	// Check pending request
	// ------------------------------------------------

	const existingRequest = await prisma.customPackageRequest.findFirst({
		where: {
			schoolId: payload.schoolId,
			status: "PENDING",
		},
	});

	if (existingRequest) {
		throw new AppError(
			409,
			"This school already has a pending custom package request",
		);
	}

	// ------------------------------------------------
	// Create request + features
	// ------------------------------------------------

	const request = await prisma.customPackageRequest.create({
		data: {
			schoolId: payload.schoolId,

			requestedStudentLimit: payload.requestedStudentLimit,

			requestedPrice: payload.requestedPrice,

			billingCycle: payload.billingCycle,

			...(payload.description !== undefined
				? {
						description: payload.description,
					}
				: {}),

			features: {
				create: payload.features.map((item) => ({
					feature: item.feature,
					enabled: item.enabled,
				})),
			},
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

			features: {
				select: {
					id: true,
					feature: true,
					enabled: true,
				},
			},
		},
	});

	return {
		...request,
		requestedPrice: Number(request.requestedPrice),
	};
};

export const getAllCustomPackageRequests = async (
	query: GetCustomPackageRequestsQuery,
) => {
	const requests = await prisma.customPackageRequest.findMany({
		where: {
			...(query.status !== undefined
				? {
						status: query.status,
					}
				: {}),

			...(query.schoolId !== undefined
				? {
						schoolId: query.schoolId,
					}
				: {}),
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

			features: {
				select: {
					id: true,
					feature: true,
					enabled: true,
				},
			},
		},

		orderBy: {
			createdAt: "desc",
		},
	});

	return requests.map((request) => ({
		...request,
		requestedPrice: Number(request.requestedPrice),
	}));
};

export const getCustomPackageRequestById = async (id: number) => {
	const request = await prisma.customPackageRequest.findUnique({
		where: {
			id,
		},

		include: {
			school: {
				select: {
					id: true,
					name: true,
					code: true,
					email: true,
					phone: true,
					status: true,
				},
			},

			features: {
				select: {
					id: true,
					feature: true,
					enabled: true,
				},
			},
		},
	});

	if (!request) {
		throw new AppError(404, "Custom package request not found");
	}

	return {
		...request,
		requestedPrice: Number(request.requestedPrice),
	};
};

export const getSchoolCustomPackageRequests = async (schoolId: number) => {
	return getAllCustomPackageRequests({
		schoolId,
	});
};

export const reviewCustomPackageRequest = async (
	requestId: number,
	reviewerId: number,
	payload: ReviewCustomPackageRequestPayload,
) => {
	// ------------------------------------------------
	// Get request
	// ------------------------------------------------

	const request = await prisma.customPackageRequest.findUnique({
		where: {
			id: requestId,
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

			features: {
				select: {
					feature: true,
					enabled: true,
				},
			},
		},
	});

	if (!request) {
		throw new AppError(404, "Custom package request not found");
	}

	// ------------------------------------------------
	// Only pending requests can be reviewed
	// ------------------------------------------------

	if (request.status !== "PENDING") {
		throw new AppError(400, "Only pending requests can be reviewed");
	}

	// ------------------------------------------------
	// Reject request
	// ------------------------------------------------

	if (payload.status === "REJECTED") {
		const rejectedRequest = await prisma.customPackageRequest.update({
			where: {
				id: requestId,
			},

			data: {
				status: "REJECTED",
				reviewedBy: reviewerId,
				reviewedAt: new Date(),

				...(payload.reviewNote !== undefined
					? {
							reviewNote: payload.reviewNote,
						}
					: {}),
			},

			include: {
				school: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},

				features: {
					select: {
						feature: true,
						enabled: true,
					},
				},
			},
		});

		return {
			request: {
				...rejectedRequest,
				requestedPrice: Number(rejectedRequest.requestedPrice),
			},

			package: null,
			subscription: null,
		};
	}

	// ------------------------------------------------
	// APPROVE
	// ------------------------------------------------

	const result = await prisma.$transaction(
		async (tx) => {
			// --------------------------------------------
			// Re-check request inside transaction
			// --------------------------------------------

			const currentRequest = await tx.customPackageRequest.findUnique({
				where: {
					id: requestId,
				},

				include: {
					features: true,
					school: {
						select: {
							id: true,
							name: true,
							code: true,
							status: true,
						},
					},
				},
			});

			if (!currentRequest) {
				throw new AppError(404, "Custom package request not found");
			}

			if (currentRequest.status !== "PENDING") {
				throw new AppError(400, "Only pending requests can be approved");
			}

			if (currentRequest.school.status !== "ACTIVE") {
				throw new AppError(
					400,
					"School must be active before approving a custom package",
				);
			}

			// --------------------------------------------
			// Check active subscription
			// --------------------------------------------

			const now = new Date();

			const activeSubscription = await tx.schoolSubscription.findFirst({
				where: {
					schoolId: currentRequest.schoolId,

					status: "ACTIVE",

					startDate: {
						lte: now,
					},

					endDate: {
						gte: now,
					},
				},

				select: {
					id: true,
					packageId: true,
				},
			});

			if (activeSubscription) {
				throw new AppError(409, "School already has an active subscription");
			}

			// --------------------------------------------
			// Generate unique package name
			// --------------------------------------------

			const packageName = `Custom-${currentRequest.school.code}-${currentRequest.id}`;

			// --------------------------------------------
			// Create custom package
			// --------------------------------------------

			const customPackage = await tx.package.create({
				data: {
					name: packageName,

					description:
						currentRequest.description ??
						`Custom package for ${currentRequest.school.name}`,

					price: currentRequest.requestedPrice,

					billingCycle: currentRequest.billingCycle,

					studentLimit: currentRequest.requestedStudentLimit,

					isCustom: true,
					isActive: true,

					features: {
						create: currentRequest.features.map((item) => ({
							feature: item.feature,
							enabled: item.enabled,
						})),
					},
				},

				include: {
					features: {
						select: {
							feature: true,
							enabled: true,
						},
					},
				},
			});

			// --------------------------------------------
			// Subscription dates
			// --------------------------------------------

			const startDate = new Date();

			const endDate = new Date(startDate);

			if (currentRequest.billingCycle === "YEARLY") {
				endDate.setFullYear(endDate.getFullYear() + 1);
			} else {
				// MONTHLY / CUSTOM
				endDate.setMonth(endDate.getMonth() + 1);
			}

			// --------------------------------------------
			// Create subscription
			// --------------------------------------------

			const subscription = await tx.schoolSubscription.create({
				data: {
					schoolId: currentRequest.schoolId,

					packageId: customPackage.id,

					startDate,
					endDate,

					status: "ACTIVE",

					price: currentRequest.requestedPrice,

					notes:
						currentRequest.reviewNote ??
						`Created from custom package request #${currentRequest.id}`,
				},

				include: {
					package: {
						select: {
							id: true,
							name: true,
							price: true,
							billingCycle: true,
							studentLimit: true,
							isCustom: true,
						},
					},
				},
			});

			// --------------------------------------------
			// Update request
			// --------------------------------------------

			const updatedRequest = await tx.customPackageRequest.update({
				where: {
					id: currentRequest.id,
				},

				data: {
					status: "APPROVED",
					reviewedBy: reviewerId,
					reviewedAt: new Date(),

					...(payload.reviewNote !== undefined
						? {
								reviewNote: payload.reviewNote,
							}
						: {}),
				},

				include: {
					school: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},

					features: {
						select: {
							feature: true,
							enabled: true,
						},
					},
				},
			});

			return {
				request: updatedRequest,
				package: customPackage,
				subscription,
			};
		},
		{
			isolationLevel: "Serializable",
		},
	);

	return {
		request: {
			...result.request,
			requestedPrice: Number(result.request.requestedPrice),
		},

		package: {
			...result.package,
			price: Number(result.package.price),
		},

		subscription: {
			...result.subscription,
			price: Number(result.subscription.price),
			package: result.subscription.package
				? {
						...result.subscription.package,
						price: Number(result.subscription.package.price),
					}
				: null,
		},
	};
};

export const cancelCustomPackageRequest = async (
	requestId: number,
	schoolId: number,
) => {
	const request = await prisma.customPackageRequest.findFirst({
		where: {
			id: requestId,
			schoolId,
		},
	});

	if (!request) {
		throw new AppError(404, "Custom package request not found");
	}

	if (request.status !== "PENDING") {
		throw new AppError(400, "Only pending requests can be cancelled");
	}

	const cancelledRequest = await prisma.customPackageRequest.update({
		where: {
			id: requestId,
		},

		data: {
			status: "CANCELLED",
		},

		include: {
			features: {
				select: {
					feature: true,
					enabled: true,
				},
			},
		},
	});

	return {
		...cancelledRequest,
		requestedPrice: Number(cancelledRequest.requestedPrice),
	};
};
