import type { NextFunction, Request, Response } from "express";

import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import {
	createGuardian,
	deleteGuardian,
	getGuardianById,
	getGuardians,
	linkStudentToGuardian,
	unlinkStudentFromGuardian,
	updateGuardian,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

export const createGuardianController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createGuardian(schoolId, req.body);
		return sendResponse(res, {
			statusCode: 201,
			message: "Guardian created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getGuardiansController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await getGuardians(schoolId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Guardians retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getGuardianByIdController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "guardian ID");
		const result = await getGuardianById(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Guardian retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateGuardianController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "guardian ID");
		const result = await updateGuardian(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Guardian updated successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const linkStudentToGuardianController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "guardian ID");
		const result = await linkStudentToGuardian(schoolId, id, req.body);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student linked to guardian successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const unlinkStudentFromGuardianController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "guardian ID");
		const studentId = parsePositiveInt(req.params.studentId, "student ID");
		const result = await unlinkStudentFromGuardian(schoolId, id, studentId);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student unlinked from guardian successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteGuardianController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "guardian ID");
		const result = await deleteGuardian(schoolId, id);
		return sendResponse(res, {
			statusCode: 200,
			message: "Guardian deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
