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
	hasOnlineAdmission: false,
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

			const rawSchoolId = req.params.schoolId ?? req.user?.schoolId;
			const schoolId = Number(rawSchoolId);

			if (!Number.isInteger(schoolId) || schoolId <= 0) {
				return next(new AppError(400, "Valid school ID is required"));
			}

			const setting = await prisma.schoolSetting.findUnique({
				where: { schoolId },
				select: {
					hasGeneralSection: true,
					hasHefzSection: true,
					hasOnlineAdmission: true,
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

			return next();
		} catch (error) {
			return next(error);
		}
	};
};
