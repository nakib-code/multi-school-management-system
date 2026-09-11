import type { ErrorRequestHandler } from "express";
import AppError from "../utils/appError.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	if (error instanceof AppError) {
		return res.status(error.statusCode).json({
			success: false,
			message: error.message,
		});
	}

	console.error("❌ Unexpected error:", error);

	return res.status(500).json({
		success: false,
		message: "Internal server error",
	});
};
