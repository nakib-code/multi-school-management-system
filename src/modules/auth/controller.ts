import type { NextFunction, Request, Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";

import AppError from "../../utils/appError.js";

import sendResponse from "../../utils/sendResponse.js";

import { getMe, login } from "./service.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: isProduction ? ("none" as const) : ("lax" as const),
	maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const loginController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await login(req.body);

		res.cookie("accessToken", result.token, cookieOptions);

		return sendResponse(res, {
			statusCode: 200,
			message: "Login successful",
			data: result.user,
		});
	} catch (error) {
		next(error);
	}
};

export const getMeController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) {
			throw new AppError(401, "Authentication required");
		}

		const result = await getMe(req.user.userId);

		return sendResponse(res, {
			statusCode: 200,
			message: "User information retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const logoutController = (_req: Request, res: Response) => {
	res.clearCookie("accessToken", {
		httpOnly: true,
		secure: isProduction,
		sameSite: isProduction ? ("none" as const) : ("lax" as const),
	});

	return sendResponse(res, {
		statusCode: 200,
		message: "Logout successful",
		data: null,
	});
};
