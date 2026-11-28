import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";

import {
	getMonthlyNetReport,
	type MonthlyNetQuery,
} from "./monthlyNet.service.js";
import {
	type AdmissionChartFilter,
	type FeeChartFilter,
	getAdmissionChartReport,
	getFeeChartReport,
	getReportOverview,
	getSchoolReportOverview,
	getStudentRosterChartReport,
	type RosterChartFilter,
} from "./service.js";

export const getReportOverviewController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) {
			throw new AppError(401, "Authentication required");
		}

		const result = await getReportOverview();

		return sendResponse(res, {
			statusCode: 200,
			message: "Report data retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getSchoolReportOverviewController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) {
			throw new AppError(401, "Authentication required");
		}
		const schoolId = Number(req.params.schoolId);
		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			throw new AppError(400, "Invalid school ID");
		}
		const result = await getSchoolReportOverview(schoolId);
		return sendResponse(res, {
			statusCode: 200,
			message: "School report overview retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getAdmissionChartReportController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = Number(req.params.schoolId);
		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			throw new AppError(400, "Invalid school ID");
		}
		const validated = res.locals.validatedRequest as
			| { query?: AdmissionChartFilter }
			| undefined;
		const result = await getAdmissionChartReport(
			schoolId,
			validated?.query ?? {},
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Admission chart report retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getFeeChartReportController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = Number(req.params.schoolId);
		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			throw new AppError(400, "Invalid school ID");
		}
		const validated = res.locals.validatedRequest as
			| { query?: FeeChartFilter }
			| undefined;
		const result = await getFeeChartReport(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Fee chart report retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentRosterChartReportController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = Number(req.params.schoolId);
		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			throw new AppError(400, "Invalid school ID");
		}
		const validated = res.locals.validatedRequest as
			| { query?: RosterChartFilter }
			| undefined;
		const result = await getStudentRosterChartReport(
			schoolId,
			validated?.query ?? {},
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student roster chart report retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getMonthlyNetReportController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = Number(req.params.schoolId);
		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			throw new AppError(400, "Invalid school ID");
		}
		const validated = res.locals.validatedRequest as
			| { query?: MonthlyNetQuery }
			| undefined;
		const result = await getMonthlyNetReport(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Monthly net income vs expense report retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
