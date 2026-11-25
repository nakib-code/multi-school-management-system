import type { BillingCycle } from "../../generated/prisma/enums.js";

export interface CreatePackagePayload {
	name: string;
	description?: string | undefined;
	price: number;
	billingCycle: BillingCycle;
	studentLimit: number;
	isActive?: boolean | undefined;
}

export interface UpdatePackagePayload {
	name?: string | undefined;
	description?: string | undefined;
	price?: number | undefined;
	billingCycle?: BillingCycle | undefined;
	studentLimit?: number | undefined;
	isActive?: boolean | undefined;
}
