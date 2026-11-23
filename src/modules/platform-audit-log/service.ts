import type { AuditAction, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

const SENSITIVE_KEYS = new Set([
	"password",
	"passwordhash",
	"adminpassword",
	"adminpasswordhash",
	"token",
	"accesstoken",
	"refreshtoken",
	"resettoken",
	"tokenhash",
	"otp",
	"code",
	"secret",
	"authorization",
]);

function sanitizeMetadata(
	meta?: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
	if (!meta) return undefined;
	const clean: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(meta)) {
		if (SENSITIVE_KEYS.has(k.toLowerCase())) continue;
		clean[k] = v;
	}
	return clean as Prisma.InputJsonValue;
}

export const recordPlatformAudit = async (input: {
	actorId?: number | null;
	action: AuditAction;
	entityType: string;
	entityId?: string | number | null;
	schoolId?: number | null;
	description?: string;
	metadata?: Record<string, unknown>;
	ipAddress?: string | null;
	userAgent?: string | null;
}) => {
	try {
		const sanitizedMeta = sanitizeMetadata(input.metadata);
		await prisma.platformAuditLog.create({
			data: {
				actorId: input.actorId ?? null,
				action: input.action,
				entityType: input.entityType,
				entityId:
					input.entityId !== undefined && input.entityId !== null
						? String(input.entityId)
						: null,
				schoolId: input.schoolId ?? null,
				description: input.description ?? null,
				...(sanitizedMeta !== undefined ? { metadata: sanitizedMeta } : {}),
				ipAddress: input.ipAddress ?? null,
				userAgent: input.userAgent ?? null,
			},
		});
	} catch (error) {
		console.error("Failed to record platform audit log:", error);
	}
};

export const getPlatformAuditLogs = async (filters: {
	page?: number;
	limit?: number;
	search?: string;
	action?: AuditAction;
	entityType?: string;
	schoolId?: number;
	actorId?: number;
	fromDate?: string;
	toDate?: string;
}) => {
	const page = Math.max(1, Number(filters.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
	const skip = (page - 1) * limit;

	const where: Prisma.PlatformAuditLogWhereInput = {};
	if (filters.action) where.action = filters.action;
	if (filters.entityType) {
		where.entityType = { contains: filters.entityType, mode: "insensitive" };
	}
	if (filters.schoolId) where.schoolId = filters.schoolId;
	if (filters.actorId) where.actorId = filters.actorId;
	if (filters.search) {
		where.OR = [
			{ description: { contains: filters.search, mode: "insensitive" } },
			{ entityType: { contains: filters.search, mode: "insensitive" } },
			{ entityId: { contains: filters.search, mode: "insensitive" } },
			{ actor: { name: { contains: filters.search, mode: "insensitive" } } },
			{ actor: { email: { contains: filters.search, mode: "insensitive" } } },
			{ school: { name: { contains: filters.search, mode: "insensitive" } } },
		];
	}
	if (filters.fromDate || filters.toDate) {
		where.createdAt = {
			...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
			...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
		};
	}

	const [logs, total] = await Promise.all([
		prisma.platformAuditLog.findMany({
			where,
			include: {
				actor: {
					select: { id: true, name: true, email: true, role: true },
				},
				school: {
					select: { id: true, name: true, code: true, status: true },
				},
			},
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
		}),
		prisma.platformAuditLog.count({ where }),
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

export const getPlatformAuditLogById = async (id: number) => {
	const log = await prisma.platformAuditLog.findUnique({
		where: { id },
		include: {
			actor: { select: { id: true, name: true, email: true, role: true } },
			school: { select: { id: true, name: true, code: true, status: true } },
		},
	});
	if (!log) {
		throw new AppError(404, "Platform audit log not found");
	}
	return log;
};
