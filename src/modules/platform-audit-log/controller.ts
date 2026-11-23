import type { Response } from "express";
import type { AuditAction } from "../../generated/prisma/client.js";
import type { AuthRequest } from "../../middleware/auth.js";
import sendResponse from "../../utils/sendResponse.js";
import { getPlatformAuditLogById, getPlatformAuditLogs } from "./service.js";

export const getPlatformAuditLogsController = async (
	req: AuthRequest,
	res: Response,
) => {
	const q = (res.locals.validatedRequest?.query ?? req.query) as Record<
		string,
		unknown
	>;
	const result = await getPlatformAuditLogs({
		page: q.page ? Number(q.page) : 1,
		limit: q.limit ? Number(q.limit) : 20,
		...(typeof q.search === "string" && q.search ? { search: q.search } : {}),
		...(typeof q.action === "string" && q.action
			? { action: q.action as AuditAction }
			: {}),
		...(typeof q.entityType === "string" && q.entityType
			? { entityType: q.entityType }
			: {}),
		...(q.schoolId ? { schoolId: Number(q.schoolId) } : {}),
		...(q.actorId ? { actorId: Number(q.actorId) } : {}),
		...(typeof q.fromDate === "string" && q.fromDate
			? { fromDate: q.fromDate }
			: {}),
		...(typeof q.toDate === "string" && q.toDate ? { toDate: q.toDate } : {}),
	});

	return sendResponse(res, {
		statusCode: 200,
		message: "Platform audit logs retrieved successfully",
		data: result.logs,
		meta: result.meta,
	});
};

export const getPlatformAuditLogByIdController = async (
	req: AuthRequest,
	res: Response,
) => {
	const id = Number(req.params.id);
	const log = await getPlatformAuditLogById(id);
	return sendResponse(res, {
		statusCode: 200,
		message: "Platform audit log retrieved successfully",
		data: log,
	});
};
