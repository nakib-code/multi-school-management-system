import type { Response } from "express";

const REDACTED_FIELDS = new Set([
	"passwordHash",
	"adminPasswordHash",
	"tokenHash",
]);

function stripSensitiveFields(value: unknown): unknown {
	if (value === null || value === undefined || typeof value !== "object") {
		return value;
	}
	if (value instanceof Date) return value;
	if (Array.isArray(value)) {
		return value.map(stripSensitiveFields);
	}
	// Preserve Decimal / custom toJSON objects
	if (typeof (value as { toJSON?: unknown }).toJSON === "function") {
		return value;
	}
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		if (REDACTED_FIELDS.has(k)) continue;
		out[k] = stripSensitiveFields(v);
	}
	return out;
}

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
		data: stripSensitiveFields(data),
		...(meta !== undefined ? { meta } : {}),
	});
};

export default sendResponse;
