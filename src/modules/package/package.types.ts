import type {
	BillingCycle,
	PackageFeature,
} from "../../generated/prisma/enums.js";

export interface PackageFeatureInput {
	feature: PackageFeature;
	enabled: boolean;
}

export interface CreatePackagePayload {
	name: string;
	description?: string | undefined;
	price: number;
	billingCycle: BillingCycle;
	studentLimit: number;
	isCustom?: boolean | undefined;
	isActive?: boolean | undefined;
	features: PackageFeatureInput[];
}

export interface UpdatePackagePayload {
	name?: string | undefined;
	description?: string | undefined;
	price?: number | undefined;
	billingCycle?: BillingCycle | undefined;
	studentLimit?: number | undefined;
	isActive?: boolean | undefined;
	features?: PackageFeatureInput[] | undefined;
}
