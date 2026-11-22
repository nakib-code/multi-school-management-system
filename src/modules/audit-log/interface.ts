import type { AuditAction } from "../../generated/prisma/client.js";

export interface CreateAuditLogInput {
	action: AuditAction;
	entity: string;
	entityId?: number;
	description?: string;
}

export interface AuditLogFilterQuery {
	action?: AuditAction;
	entity?: string;
	userId?: number;
	fromDate?: Date;
	toDate?: Date;
	page?: number;
	limit?: number;
}
