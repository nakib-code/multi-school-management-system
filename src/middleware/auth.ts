import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import AppError from "../utils/appError.js";
import { verifyToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
	user?: {
		userId: number;
		role: UserRole;
		schoolId?: number;
	};
}

export const authenticate = async (
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
		const decoded = verifyToken(token) as {
			userId: number;
			role: UserRole;
			schoolId?: number;
			iat?: number;
		};

		// Verify user still exists, is active, and token predates any password reset
		const dbUser = await prisma.user.findUnique({
			where: { id: decoded.userId },
			select: { status: true, passwordChangedAt: true },
		});

		if (!dbUser || dbUser.status !== "ACTIVE") {
			return next(new AppError(401, "Session is no longer active"));
		}

		if (
			dbUser.passwordChangedAt &&
			decoded.iat &&
			decoded.iat * 1000 < dbUser.passwordChangedAt.getTime()
		) {
			return next(
				new AppError(401, "Password was recently changed. Please sign in again."),
			);
		}

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
