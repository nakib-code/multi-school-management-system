import type {
  BillingCycle,
  CustomPackageRequestStatus,
  PackageFeature,
} from "../../generated/prisma/client.js";

export interface CustomPackageFeatureInput {
  feature: PackageFeature;
  enabled: boolean;
}

export interface CreateCustomPackageRequestPayload {
  schoolId: number;
  requestedStudentLimit: number;
  requestedPrice: number;
  billingCycle: BillingCycle;
  description?: string | undefined;
  features: CustomPackageFeatureInput[];
}

export interface ReviewCustomPackageRequestPayload {
  status: "APPROVED" | "REJECTED";
  reviewNote?: string | undefined;
}

export interface GetCustomPackageRequestsQuery {
  status?: CustomPackageRequestStatus | undefined;
  schoolId?: number | undefined;
}