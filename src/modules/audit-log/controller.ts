import type { NextFunction, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import type { AuditLogFilterQuery } from "./interface.js";
import { createAuditLog, getAuditLogById, getAuditLogs } from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createAuditLogController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const userAgent = req.headers["user-agent"];
		const result = await createAuditLog(schoolId, req.body, {
			...(req.user?.userId !== undefined ? { userId: req.user.userId } : {}),
			...(req.ip !== undefined ? { ipAddress: req.ip } : {}),
			...(typeof userAgent === "string" ? { userAgent } : {}),
		});
		return sendResponse(res, {
			statusCode: 201,
			message: "Audit log created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getAuditLogsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: AuditLogFilterQuery }
			| undefined;
		const { logs, meta } = await getAuditLogs(schoolId, validated?.query ?? {});
		return sendResponse(res, {
			statusCode: 200,
			message: "Audit logs retrieved successfully",
			data: logs,
			meta,
		});
	} catch (error) {
		next(error);
	}
};

export const getAuditLogByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "audit log ID");
		const result = await getAuditLogById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Audit log retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
