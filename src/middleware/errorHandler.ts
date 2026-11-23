import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import AppError from "../utils/appError.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	if (error instanceof AppError) {
		return res.status(error.statusCode).json({
			success: false,
			message: error.message,
		});
	}

	if (error instanceof ZodError) {
		const message = error.issues.map((i) => i.message).join(", ");
		return res.status(400).json({
			success: false,
			message: message || "Validation failed",
		});
	}

	console.error("❌ Unexpected error:", error);

	return res.status(500).json({
		success: false,
		message: "Internal server error",
	});
};
