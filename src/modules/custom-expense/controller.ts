import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordSchoolAudit } from "../audit-log/service.js";
import {
	createCustomExpenseEntry,
	createCustomExpenseSheet,
	deleteCustomExpenseEntry,
	deleteOrArchiveCustomExpenseSheet,
	getCustomExpenseMonthlyChart,
	listCustomExpenseEntries,
	listCustomExpenseSheets,
	updateCustomExpenseEntry,
	updateCustomExpenseSheetFields,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const listSheetsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const includeInactive =
			req.query.includeInactive === "true" ||
			(req.query.includeInactive as unknown) === true;
		const sheets = await listCustomExpenseSheets(schoolId, includeInactive);
		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Custom expense sheets fetched successfully",
			data: sheets,
		});
	} catch (err) {
		next(err);
	}
};

export const createSheetController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheet = await createCustomExpenseSheet(
			schoolId,
			req.user.userId,
			req.body,
		);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "CREATE",
			entity: "CustomExpenseSheet",
			entityId: sheet.id,
			description: `Created custom expense sheet "${sheet.name}" with ${sheet.fields.length} custom column(s)`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 201,
			success: true,
			message: "Custom expense sheet created successfully",
			data: sheet,
		});
	} catch (err) {
		next(err);
	}
};

export const updateSheetFieldsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");
		const sheet = await updateCustomExpenseSheetFields(
			schoolId,
			sheetId,
			req.body,
		);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "UPDATE",
			entity: "CustomExpenseSheet",
			entityId: sheet.id,
			description: `Updated custom fields on sheet "${sheet.name}" (${sheet.fields.length} column(s))`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Custom sheet columns updated successfully",
			data: sheet,
		});
	} catch (err) {
		next(err);
	}
};

export const deleteSheetController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");
		const archive =
			req.query.archive === "true" || (req.query.archive as unknown) === true;

		const result = await deleteOrArchiveCustomExpenseSheet(
			schoolId,
			sheetId,
			archive,
		);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "DELETE",
			entity: "CustomExpenseSheet",
			entityId: result.id,
			description: result.archived
				? `Archived custom expense sheet "${result.name}"`
				: `Deleted custom expense sheet "${result.name}"`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: result.archived
				? "Custom expense sheet archived successfully"
				: "Custom expense sheet deleted successfully",
			data: result,
		});
	} catch (err) {
		next(err);
	}
};

export const listEntriesController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");
		const billingMonth =
			typeof req.query.billingMonth === "string"
				? req.query.billingMonth
				: undefined;
		const search =
			typeof req.query.search === "string" ? req.query.search : undefined;

		const result = await listCustomExpenseEntries(schoolId, sheetId, {
			...(billingMonth ? { billingMonth } : {}),
			...(search ? { search } : {}),
		});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Custom expense entries fetched successfully",
			data: result,
		});
	} catch (err) {
		next(err);
	}
};

export const createEntryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");
		const entry = await createCustomExpenseEntry(
			schoolId,
			sheetId,
			req.user.userId,
			req.body,
		);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "CREATE",
			entity: "CustomExpenseEntry",
			entityId: entry.id,
			description: `Added entry #${entry.id} (৳${entry.amount}) to sheet #${sheetId} for ${entry.billingMonth}`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 201,
			success: true,
			message: "Expense entry added successfully",
			data: entry,
		});
	} catch (err) {
		next(err);
	}
};

export const updateEntryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");
		const entryId = parsePositiveInt(req.params.entryId, "entry ID");
		const entry = await updateCustomExpenseEntry(
			schoolId,
			sheetId,
			entryId,
			req.body,
		);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "UPDATE",
			entity: "CustomExpenseEntry",
			entityId: entry.id,
			description: `Updated entry #${entry.id} (৳${entry.amount}) on sheet #${sheetId} (${entry.billingMonth})`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Expense entry updated successfully",
			data: entry,
		});
	} catch (err) {
		next(err);
	}
};

export const deleteEntryController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");
		const entryId = parsePositiveInt(req.params.entryId, "entry ID");
		const deleted = await deleteCustomExpenseEntry(schoolId, sheetId, entryId);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "DELETE",
			entity: "CustomExpenseEntry",
			entityId: deleted.id,
			description: `Deleted entry #${deleted.id} (৳${deleted.amount}) from sheet #${sheetId} (${deleted.billingMonth})`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Expense entry deleted successfully",
			data: deleted,
		});
	} catch (err) {
		next(err);
	}
};

export const getMonthlyChartController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");
		const billingMonth = String(req.query.billingMonth);

		const chart = await getCustomExpenseMonthlyChart(schoolId, sheetId, {
			billingMonth,
		});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Monthly custom expense chart fetched successfully",
			data: chart,
		});
	} catch (err) {
		next(err);
	}
};
