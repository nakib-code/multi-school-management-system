import type { NextFunction, Request, Response } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import {
	approveSchool,
	blockSchool,
	createSchool,
	deleteSchool,
	rejectSchool,
	unblockSchool,
	verifyAdminEmail,
} from "./service.js";

export const createSchoolController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await createSchool(req.body);

		sendResponse(res, {
			statusCode: 201,
			message: "School registration submitted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const approveSchoolController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = Number(req.params.id);

		if (Number.isNaN(schoolId)) {
			throw new AppError(400, "Invalid school ID");
		}

		const result = await approveSchool(schoolId, req.user!.userId);

		sendResponse(res, {
			statusCode: 200,
			message: "School approved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const verifyAdminEmailController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await verifyAdminEmail(req.body);

		sendResponse(res, {
			statusCode: 200,
			message: "Admin email verified successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const blockSchoolController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = Number(req.params.id);

		if (Number.isNaN(schoolId)) {
			throw new AppError(400, "Invalid school ID");
		}

		const result = await blockSchool(schoolId);

		sendResponse(res, {
			statusCode: 200,
			message: "School blocked successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const unblockSchoolController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = Number(req.params.id);

		if (Number.isNaN(schoolId)) {
			throw new AppError(400, "Invalid school ID");
		}

		const result = await unblockSchool(schoolId);

		sendResponse(res, {
			statusCode: 200,
			message: "School unblocked successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const rejectSchoolController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = Number(req.params.id);

		if (Number.isNaN(schoolId)) {
			throw new AppError(400, "Invalid school ID");
		}

		const result = await rejectSchool(schoolId, req.body);

		sendResponse(res, {
			statusCode: 200,
			message: "School rejected successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteSchoolController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = Number(req.params.id);

		if (Number.isNaN(schoolId)) {
			throw new AppError(400, "Invalid school ID");
		}

		const result = await deleteSchool(schoolId);

		sendResponse(res, {
			statusCode: 200,
			message: "School deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
