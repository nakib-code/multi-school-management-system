import type { NextFunction, Request, Response } from "express";
import sendResponse from "../../utils/sendResponse.js";
import { login } from "./service.js";

export const loginController = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const result = await login(req.body);

		sendResponse(res, {
			statusCode: 200,
			message: "Login successful",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
