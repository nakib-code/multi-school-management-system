import type { Response } from "express";

interface SendResponseData<T> {
	statusCode?: number;
	success?: boolean;
	message: string;
	data?: T;
}

const sendResponse = <T>(
	res: Response,
	{ statusCode = 200, success = true, message, data }: SendResponseData<T>,
) => {
	return res.status(statusCode).json({
		success,
		message,
		data,
	});
};

export default sendResponse;
