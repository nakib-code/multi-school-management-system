import type { NextFunction, Response } from "express";
import type { PackageFeature } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import AppError from "../utils/appError.js";
import type { AuthRequest } from "./auth.js";

export const requirePackageFeature = (feature: PackageFeature) => {
	return async (req: AuthRequest, _res: Response, next: NextFunction) => {
		try {
			// ----------------------------------------------
			// Authentication check
			// ----------------------------------------------

			if (!req.user) {
				return next(new AppError(401, "Authentication required"));
			}

			// ----------------------------------------------
			// Super Admin does not need package restriction
			// ----------------------------------------------

			if (req.user.role === "SUPER_ADMIN") {
				return next();
			}

			// ----------------------------------------------
			// School ID required
			// ----------------------------------------------

			if (!req.user.schoolId) {
				return next(new AppError(403, "School information is missing"));
			}

			const schoolId = req.user.schoolId;

			// ----------------------------------------------
			// Find active subscription
			// ----------------------------------------------

			const now = new Date();

			const subscription = await prisma.schoolSubscription.findFirst({
				where: {
					schoolId,
					status: "ACTIVE",

					startDate: {
						lte: now,
					},

					endDate: {
						gte: now,
					},

					package: {
						isActive: true,
					},
				},

				include: {
					package: {
						include: {
							features: {
								where: {
									feature,
									enabled: true,
								},

								select: {
									feature: true,
									enabled: true,
								},
							},
						},
					},
				},

				orderBy: {
					startDate: "desc",
				},
			});

			// ----------------------------------------------
			// No active subscription
			// ----------------------------------------------

			if (!subscription) {
				return next(
					new AppError(403, "Your school does not have an active subscription"),
				);
			}

			// ----------------------------------------------
			// Feature access check
			// ----------------------------------------------

			const hasFeature = subscription.package.features.length > 0;

			if (!hasFeature) {
				return next(
					new AppError(
						403,
						`Your current ${subscription.package.name} package does not include this feature`,
					),
				);
			}

			// ----------------------------------------------
			// Feature allowed
			// ----------------------------------------------

			next();
		} catch (error) {
			next(error);
		}
	};
};
