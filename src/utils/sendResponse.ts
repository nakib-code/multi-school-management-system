import type { Response } from "express";

interface SendResponseData<T> {
	statusCode?: number;
	success?: boolean;
	message: string;
	data?: T;
	meta?: Record<string, unknown>;
}

const sendResponse = <T>(
	res: Response,
	{
		statusCode = 200,
		success = true,
		message,
		data,
		meta,
	}: SendResponseData<T>,
) => {
	return res.status(statusCode).json({
		success,
		message,
		data,
		...(meta !== undefined ? { meta } : {}),
	});
};

export default sendResponse;
