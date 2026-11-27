import type { NextFunction, Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordSchoolAudit } from "../audit-log/service.js";
import {
	createManager,
	deleteManager,
	getManagerById,
	getManagers,
	resetManagerPassword,
	updateManager,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createManagerController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createManager(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Manager created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getManagersController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await getManagers(schoolId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Managers retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getManagerByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "manager ID");
		const result = await getManagerById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Manager retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateManagerController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "manager ID");
		const result = await updateManager(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Manager updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteManagerController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "manager ID");
		const result = await deleteManager(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Manager deactivated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const resetManagerPasswordController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const managerId = parsePositiveInt(req.params.id, "manager ID");
		const newPassword =
			typeof req.body?.newPassword === "string"
				? req.body.newPassword
				: undefined;

		const result = await resetManagerPassword(schoolId, managerId, newPassword);

		await recordSchoolAudit({
			schoolId,
			userId: req.user?.userId ?? null,
			action: "UPDATE",
			entity: "Manager",
			entityId: managerId,
			description: `Reset password for manager ${result.name}`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		});

		return sendResponse(res, {
			statusCode: 200,
			message: "Manager password reset successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
