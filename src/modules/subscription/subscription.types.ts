import type { SubscriptionStatus } from "../../generated/prisma/client.js";

export interface CreateSubscriptionPayload {
	schoolId: number;
	packageId: number;
	startDate: Date;
	endDate: Date;
	price: number;
	notes?: string | undefined;
}

export interface SelectPackagePayload {
	packageId: number;
}

export interface UpdateSubscriptionPayload {
	startDate?: Date | undefined;
	endDate?: Date | undefined;
	price?: number | undefined;
	notes?: string | undefined;
}

export interface UpdateSubscriptionStatusPayload {
	status: SubscriptionStatus;
}
