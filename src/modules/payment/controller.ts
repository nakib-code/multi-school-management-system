import type { NextFunction, Request, Response } from "express";

import sendResponse from "../../utils/sendResponse.js";
import { getPlatformPaymentMethods } from "./service.js";

export const getPlatformPaymentMethodsController = async (
	_req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const data = await getPlatformPaymentMethods();
		return sendResponse(res, {
			statusCode: 200,
			message: "Supported manual payment methods retrieved successfully",
			data,
		});
	} catch (error) {
		next(error);
	}
};
