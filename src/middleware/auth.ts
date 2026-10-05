import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "../generated/prisma/client.js";
import AppError from "../utils/appError.js";
import { verifyToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
	user?: {
		userId: number;
		role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "TEACHER" | "STUDENT";
		schoolId?: number;
	};
}

export const authenticate = (
	req: AuthRequest,
	_res: Response,
	next: NextFunction,
) => {
	const cookieToken = req.cookies?.accessToken;

	const authHeader = req.headers.authorization;

	const headerToken = authHeader?.startsWith("Bearer ")
		? authHeader.split(" ")[1]
		: undefined;

	const token = cookieToken || headerToken;

	if (!token) {
		return next(new AppError(401, "Authentication required"));
	}

	try {
		const decoded = verifyToken(token);

		req.user = {
			userId: decoded.userId,
			role: decoded.role,
			...(decoded.schoolId !== undefined && {
				schoolId: decoded.schoolId,
			}),
		};

		next();
	} catch {
		return next(new AppError(401, "Invalid or expired token"));
	}
};

export const authorize = (...allowedRoles: UserRole[]) => {
	return (req: AuthRequest, _res: Response, next: NextFunction) => {
		if (!req.user) {
			return next(new AppError(401, "Authentication required"));
		}

		if (!allowedRoles.includes(req.user.role as UserRole)) {
			return next(
				new AppError(403, "You do not have permission to perform this action"),
			);
		}

		next();
	};
};
