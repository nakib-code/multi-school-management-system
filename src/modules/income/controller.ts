import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordSchoolAudit } from "../audit-log/service.js";
import type { IncomeCategoryFilter } from "./interface.js";
import {
	createOtherIncomeEntry,
	deleteOtherIncomeEntry,
	getIncomeMonthlyChart,
	getIncomeSummary,
	updateOtherIncomeEntry,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createOtherIncomeController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const entry = await createOtherIncomeEntry(
			schoolId,
			req.user.userId,
			req.body,
		);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "CREATE",
			entity: "IncomeEntry",
			entityId: entry.id,
			description: `Recorded out-income "${entry.title}" (${entry.sourceLabel}, ৳${entry.amount}, ${entry.billingMonth})`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 201,
			success: true,
			message: "Out-income entry recorded successfully",
			data: entry,
		});
	} catch (err) {
		next(err);
	}
};

export const updateOtherIncomeController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "income entry ID");
		const entry = await updateOtherIncomeEntry(schoolId, id, req.body);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "UPDATE",
			entity: "IncomeEntry",
			entityId: entry.id,
			description: `Updated out-income #${entry.id} "${entry.title}" (৳${entry.amount}, ${entry.billingMonth})`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Out-income entry updated successfully",
			data: entry,
		});
	} catch (err) {
		next(err);
	}
};

export const deleteOtherIncomeController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "income entry ID");
		const deleted = await deleteOtherIncomeEntry(schoolId, id);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "DELETE",
			entity: "IncomeEntry",
			entityId: deleted.id,
			description: `Deleted out-income #${deleted.id} "${deleted.title}" (৳${deleted.amount}, ${deleted.billingMonth})`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Out-income entry deleted successfully",
			data: deleted,
		});
	} catch (err) {
		next(err);
	}
};

export const getIncomeSummaryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const billingMonth =
			typeof req.query.billingMonth === "string"
				? req.query.billingMonth
				: undefined;
		const category =
			typeof req.query.category === "string"
				? (req.query.category as IncomeCategoryFilter)
				: undefined;
		const startDate =
			typeof req.query.startDate === "string" ? req.query.startDate : undefined;
		const endDate =
			typeof req.query.endDate === "string" ? req.query.endDate : undefined;
		const search =
			typeof req.query.search === "string" ? req.query.search : undefined;

		const summary = await getIncomeSummary(schoolId, {
			...(billingMonth ? { billingMonth } : {}),
			...(category ? { category } : {}),
			...(startDate ? { startDate } : {}),
			...(endDate ? { endDate } : {}),
			...(search ? { search } : {}),
		});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Income summary fetched successfully",
			data: summary,
		});
	} catch (err) {
		next(err);
	}
};

export const getIncomeMonthlyChartController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const billingMonth = String(req.query.billingMonth);
		const category =
			typeof req.query.category === "string"
				? (req.query.category as IncomeCategoryFilter)
				: undefined;

		const chart = await getIncomeMonthlyChart(schoolId, {
			billingMonth,
			...(category ? { category } : {}),
		});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Monthly income chart fetched successfully",
			data: chart,
		});
	} catch (err) {
		next(err);
	}
};
