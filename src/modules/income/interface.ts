import type { PaymentMethod } from "../../generated/prisma/client.js";

export type UnifiedIncomeCategory =
	| "MONTHLY_FEE"
	| "ADMISSION_FEE"
	| "OTHER_STUDENT_FEE"
	| "OTHER_INCOME";

export type IncomeCategoryFilter = "ALL" | UnifiedIncomeCategory;

export type IncomeSourceType =
	| "STUDENT_PAYMENT"
	| "ADMISSION_PAYMENT"
	| "MANUAL_INCOME";

export interface CreateOtherIncomeInput {
	sourceLabel: string;
	title: string;
	amount: number;
	incomeDate?: string;
	paymentMethod?: PaymentMethod;
	referenceNo?: string | null;
	notes?: string | null;
}

export interface UpdateOtherIncomeInput {
	sourceLabel?: string;
	title?: string;
	amount?: number;
	incomeDate?: string;
	paymentMethod?: PaymentMethod;
	referenceNo?: string | null;
	notes?: string | null;
}

export interface IncomeSummaryQuery {
	billingMonth?: string;
	category?: IncomeCategoryFilter;
	startDate?: string;
	endDate?: string;
	search?: string;
}

export interface IncomeChartQuery {
	billingMonth: string;
	category?: IncomeCategoryFilter;
}

export interface UnifiedIncomeRow {
	serial: number;
	id: string;
	entryId: number;
	date: string; // YYYY-MM-DD
	billingMonth: string; // YYYY-MM
	category: UnifiedIncomeCategory;
	categoryLabel: string;
	sourceType: IncomeSourceType;
	sourceOrStudent: string;
	sourceLabel: string | null;
	title: string;
	paymentMethod: string;
	referenceNo: string | null;
	notes: string | null;
	amount: number;
	recordedBy: string | null;
}
