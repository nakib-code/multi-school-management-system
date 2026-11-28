import type { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma.js";
import AppError from "../utils/appError.js";
import type { AuthRequest } from "./auth.js";

export type SchoolFeatureKey =
	| "hasGeneralSection"
	| "hasHefzSection"
	| "hasOnlineAdmission"
	| "hasTeacherPayroll"
	| "smsEnabled";

export interface SchoolFeatureFlags {
	hasGeneralSection: boolean;
	hasHefzSection: boolean;
	hasOnlineAdmission: boolean;
	hasTeacherPayroll: boolean;
	smsEnabled: boolean;
}

export const DEFAULT_SCHOOL_FEATURES: SchoolFeatureFlags = {
	hasGeneralSection: true,
	hasHefzSection: true,
	hasOnlineAdmission: true,
	hasTeacherPayroll: false,
	smsEnabled: false,
};

const FEATURE_LABELS: Record<SchoolFeatureKey, string> = {
	hasGeneralSection: "General / Kindergarten Section",
	hasHefzSection: "Hefz & Najera Tracking",
	hasOnlineAdmission: "Online Admissions",
	hasTeacherPayroll: "Teacher Payroll & Salaries",
	smsEnabled: "SMS Notifications",
};

export const requireSchoolFeature = (featureKey: SchoolFeatureKey) => {
	return async (req: AuthRequest, _res: Response, next: NextFunction) => {
		try {
			// Super Admin always has access
			if (req.user?.role === "SUPER_ADMIN") {
				return next();
			}

			let schoolId = Number(req.params.schoolId ?? req.user?.schoolId);

			if ((!Number.isInteger(schoolId) || schoolId <= 0) && req.params.slug) {
				const slug = String(req.params.slug).trim();
				if (slug) {
					const schoolBySlug = await prisma.school.findFirst({
						where: { OR: [{ slug }, { code: slug }] },
						select: { id: true },
					});
					if (!schoolBySlug) {
						return next(new AppError(404, "School not found"));
					}
					schoolId = schoolBySlug.id;
				}
			}

			if (!Number.isInteger(schoolId) || schoolId <= 0) {
				return next(new AppError(400, "Valid school ID is required"));
			}

			const setting = await prisma.schoolSetting.findUnique({
				where: { schoolId },
				select: {
					hasGeneralSection: true,
					hasHefzSection: true,
					hasOnlineAdmission: true,
					onlineAdmissionPaused: true,
					hasTeacherPayroll: true,
					smsEnabled: true,
				},
			});

			const isEnabled = setting
				? setting[featureKey]
				: DEFAULT_SCHOOL_FEATURES[featureKey];

			if (!isEnabled) {
				return next(
					new AppError(
						403,
						`${FEATURE_LABELS[featureKey]} is currently disabled for this institution. Please contact the platform administrator.`,
					),
				);
			}

			if (
				featureKey === "hasOnlineAdmission" &&
				setting?.onlineAdmissionPaused
			) {
				// Allow school staff (ADMIN/MANAGER) to still review existing admissions while paused
				const isStaff =
					req.user?.role === "ADMIN" || req.user?.role === "MANAGER";
				if (!isStaff) {
					return next(
						new AppError(
							403,
							"Online Admissions are currently paused by the institution.",
						),
					);
				}
			}

			return next();
		} catch (error) {
			return next(error);
		}
	};
};
