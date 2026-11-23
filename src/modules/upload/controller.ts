import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { deleteUploadedFile, listMyUploads, uploadFile } from "./service.js";

export const uploadFileController = async (req: AuthRequest, res: Response) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const record = await uploadFile({
		actor: req.user,
		dataUrl: req.body.dataUrl,
		category: req.body.category,
	});
	return sendResponse(res, {
		statusCode: 201,
		message: "File uploaded successfully",
		data: record,
	});
};

export const listUploadsController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const files = await listMyUploads(req.user);
	return sendResponse(res, {
		statusCode: 200,
		message: "Uploaded files retrieved successfully",
		data: files,
	});
};

export const deleteUploadController = async (
	req: AuthRequest,
	res: Response,
) => {
	if (!req.user) throw new AppError(401, "Authentication required");
	const result = await deleteUploadedFile(req.user, Number(req.params.id));
	return sendResponse(res, {
		statusCode: 200,
		message: "File deleted successfully",
		data: result,
	});
};
