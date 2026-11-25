import type { Request, Response } from "express";
import sendResponse from "../../utils/sendResponse.js";
import { getPlatformSetting, updatePlatformSetting } from "./service.js";

export const getPlatformSettingController = async (
	_req: Request,
	res: Response,
) => {
	const result = await getPlatformSetting();

	return sendResponse(res, {
		statusCode: 200,
		message: "Platform settings retrieved successfully",
		data: result,
	});
};

export const updatePlatformSettingController = async (
	req: Request,
	res: Response,
) => {
	const result = await updatePlatformSetting(req.body);

	return sendResponse(res, {
		statusCode: 200,
		message: "Platform settings updated successfully",
		data: result,
	});
};
