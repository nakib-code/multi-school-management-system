import type { UserRole } from "../../generated/prisma/client.js";

export type DashboardRole = UserRole;

export interface DashboardUser {
	userId: number;
	role: DashboardRole;
	schoolId?: number;
}

export interface DashboardQuery {
	academicYear?: string;
}
