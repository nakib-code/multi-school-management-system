import type { NextFunction, Response } from "express";
import AppError from "../utils/appError.js";
import type { AuthRequest } from "./auth.js";

export const requireSchoolAccess = (
	req: AuthRequest,
	_res: Response,
	next: NextFunction,
) => {
	if (!req.user) {
		return next(new AppError(401, "Authentication required"));
	}

	// SUPER_ADMIN is platform-level.
	// SUPER_ADMIN does not access school internal data.
	if (req.user.role === "SUPER_ADMIN") {
		return next(
			new AppError(403, "SUPER_ADMIN cannot access school internal data"),
		);
	}

	if (req.user.schoolId === undefined) {
		return next(new AppError(403, "You are not associated with any school"));
	}

	const schoolId = Number(req.params.schoolId);

	if (!schoolId || Number.isNaN(schoolId)) {
		return next(new AppError(400, "Invalid school ID"));
	}

	if (req.user.schoolId !== schoolId) {
		return next(new AppError(403, "You do not have access to this school"));
	}

	next();
};
