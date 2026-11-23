import type { Response } from "express";
import type { DayOfWeek } from "../../generated/prisma/client.js";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import {
	createClassRoutine,
	deleteClassRoutine,
	getClassRoutines,
	updateClassRoutine,
} from "./service.js";

export const createRoutineController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const routine = await createClassRoutine(schoolId, req.body);
	return sendResponse(res, {
		statusCode: 201,
		message: "Class routine created successfully",
		data: routine,
	});
};

export const getRoutinesController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const schoolId = Number(req.params.schoolId);
	const q = (res.locals.validatedRequest?.query ?? req.query) as Record<
		string,
		unknown
	>;
	const routines = await getClassRoutines(schoolId, req.user, {
		...(q.classId ? { classId: Number(q.classId) } : {}),
		...(q.sectionId ? { sectionId: Number(q.sectionId) } : {}),
		...(q.teacherId ? { teacherId: Number(q.teacherId) } : {}),
		...(typeof q.dayOfWeek === "string"
			? { dayOfWeek: q.dayOfWeek as DayOfWeek }
			: {}),
		...(typeof q.academicYear === "string" && q.academicYear
			? { academicYear: q.academicYear }
			: {}),
	});
	return sendResponse(res, {
		statusCode: 200,
		message: "Class routines retrieved successfully",
		data: routines,
	});
};

export const updateRoutineController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const id = Number(req.params.id);
	const routine = await updateClassRoutine(schoolId, id, req.body);
	return sendResponse(res, {
		statusCode: 200,
		message: "Class routine updated successfully",
		data: routine,
	});
};

export const deleteRoutineController = async (
	req: AuthRequest,
	res: Response,
) => {
	const schoolId = Number(req.params.schoolId);
	const id = Number(req.params.id);
	const result = await deleteClassRoutine(schoolId, id);
	return sendResponse(res, {
		statusCode: 200,
		message: "Class routine deleted successfully",
		data: result,
	});
};
