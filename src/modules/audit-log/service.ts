import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type { AuditLogFilterQuery, CreateAuditLogInput } from "./interface.js";

const auditLogInclude = {
	user: {
		select: { id: true, name: true, email: true, role: true },
	},
};

export const createAuditLog = async (
	schoolId: number,
	payload: CreateAuditLogInput,
	meta?: { userId?: number; ipAddress?: string; userAgent?: string },
) => {
	return prisma.auditLog.create({
		data: {
			schoolId,
			action: payload.action,
			entity: payload.entity,
			...(payload.entityId !== undefined ? { entityId: payload.entityId } : {}),
			...(payload.description !== undefined
				? { description: payload.description }
				: {}),
			...(meta?.userId !== undefined ? { userId: meta.userId } : {}),
			...(meta?.ipAddress !== undefined ? { ipAddress: meta.ipAddress } : {}),
			...(meta?.userAgent !== undefined ? { userAgent: meta.userAgent } : {}),
		},
		include: auditLogInclude,
	});
};

export const getAuditLogs = async (
	schoolId: number,
	query: AuditLogFilterQuery,
) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? 20;
	const skip = (page - 1) * limit;

	const createdAtFilter: { gte?: Date; lte?: Date } = {};
	if (query.fromDate) createdAtFilter.gte = query.fromDate;
	if (query.toDate) createdAtFilter.lte = query.toDate;

	const where = {
		schoolId,
		...(query.action !== undefined ? { action: query.action } : {}),
		...(query.entity !== undefined ? { entity: query.entity } : {}),
		...(query.userId !== undefined ? { userId: query.userId } : {}),
		...(Object.keys(createdAtFilter).length > 0
			? { createdAt: createdAtFilter }
			: {}),
	};

	const [logs, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			include: auditLogInclude,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.auditLog.count({ where }),
	]);

	return {
		logs,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	};
};

export const getAuditLogById = async (schoolId: number, id: number) => {
	const log = await prisma.auditLog.findFirst({
		where: { id, schoolId },
		include: auditLogInclude,
	});
	if (!log) throw new AppError(404, "Audit log not found");
	return log;
};

/**
 * Fire-and-forget helper for automatically recording school-level audit logs.
 */
export const recordSchoolAudit = async (params: {
	schoolId: number;
	userId?: number | null;
	action: CreateAuditLogInput["action"];
	entity: string;
	entityId?: number | null;
	description?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
}) => {
	try {
		await prisma.auditLog.create({
			data: {
				schoolId: params.schoolId,
				action: params.action,
				entity: params.entity,
				...(params.entityId != null ? { entityId: params.entityId } : {}),
				...(params.description ? { description: params.description } : {}),
				...(params.userId != null ? { userId: params.userId } : {}),
				...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
				...(params.userAgent ? { userAgent: params.userAgent } : {}),
			},
		});
	} catch (error) {
		console.error("[recordSchoolAudit] Failed to write audit log:", error);
	}
};
