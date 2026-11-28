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
	restoreCustomExpenseSheet,
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
		const billingMonth =
			typeof req.query.billingMonth === "string"
				? req.query.billingMonth
				: undefined;
		const sheets = await listCustomExpenseSheets(
			schoolId,
			includeInactive,
			billingMonth,
		);
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
		const { sheet, previous } = await updateCustomExpenseSheetFields(
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
			description: `Updated sheet #${sheet.id}: before [name="${previous.name}", cols=${previous.fieldLabels.join(",") || "none"}] -> after [name="${sheet.name}", cols=${sheet.fields.map((f) => f.label).join(",") || "none"}]`,
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
				? `Archived custom expense sheet "${result.name}" (${result.entryCount} entries preserved)`
				: `Permanently deleted custom expense sheet "${result.name}" (had ${result.entryCount} entries)`,
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

export const restoreSheetController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const sheetId = parsePositiveInt(req.params.sheetId, "sheet ID");

		const sheet = await restoreCustomExpenseSheet(schoolId, sheetId);

		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "UPDATE",
			entity: "CustomExpenseSheet",
			entityId: sheet.id,
			description: `Restored archived custom expense sheet "${sheet.name}"`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		return sendResponse(res, {
			statusCode: 200,
			success: true,
			message: "Custom expense sheet restored successfully",
			data: sheet,
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
		const startDate =
			typeof req.query.startDate === "string" ? req.query.startDate : undefined;
		const endDate =
			typeof req.query.endDate === "string" ? req.query.endDate : undefined;
		const search =
			typeof req.query.search === "string" ? req.query.search : undefined;

		const result = await listCustomExpenseEntries(schoolId, sheetId, {
			...(billingMonth ? { billingMonth } : {}),
			...(startDate ? { startDate } : {}),
			...(endDate ? { endDate } : {}),
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
			description: `Added entry #${entry.id} (${entry.voucherNo ?? "no-voucher"}, ৳${entry.amount}, ${entry.paymentMethod}) to sheet #${sheetId} for ${entry.billingMonth}`,
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
		const { previous, ...entry } = await updateCustomExpenseEntry(
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
			description: `Updated entry #${entry.id} on sheet #${sheetId}: before [৳${previous.amount}, ${previous.entryDate}, ${previous.paymentMethod}] -> after [৳${entry.amount}, ${entry.entryDate}, ${entry.paymentMethod}]`,
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
			description: `Deleted entry #${deleted.id} from sheet #${sheetId}: before [voucher=${deleted.voucherNo ?? "none"}, ৳${deleted.amount}, ${deleted.entryDate}, ${deleted.paymentMethod}]`,
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
		const startDate =
			typeof req.query.startDate === "string" ? req.query.startDate : undefined;
		const endDate =
			typeof req.query.endDate === "string" ? req.query.endDate : undefined;
		const search =
			typeof req.query.search === "string" ? req.query.search : undefined;

		const chart = await getCustomExpenseMonthlyChart(schoolId, sheetId, {
			billingMonth,
			...(startDate ? { startDate } : {}),
			...(endDate ? { endDate } : {}),
			...(search ? { search } : {}),
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
