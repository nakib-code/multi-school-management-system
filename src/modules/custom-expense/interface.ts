import type {
	CustomExpenseFieldType,
	PaymentMethod,
} from "../../generated/prisma/client.js";

export interface CustomExpenseFieldInput {
	id?: number;
	label: string;
	fieldKey?: string;
	fieldType: CustomExpenseFieldType;
	isRequired?: boolean;
	sortOrder?: number;
}

export interface CreateCustomExpenseSheetInput {
	name: string;
	description?: string | null;
	fields?: CustomExpenseFieldInput[];
}

export interface UpdateCustomExpenseSheetFieldsInput {
	name?: string;
	description?: string | null;
	fields: CustomExpenseFieldInput[];
}

export interface CreateCustomExpenseEntryInput {
	entryDate?: string;
	amount: number;
	paymentMethod?: PaymentMethod;
	attachmentUrl?: string | null;
	fieldValues?: Record<string, unknown>;
}

export interface UpdateCustomExpenseEntryInput {
	entryDate?: string;
	amount?: number;
	paymentMethod?: PaymentMethod;
	attachmentUrl?: string | null;
	fieldValues?: Record<string, unknown>;
}

export interface CustomExpenseEntriesFilterQuery {
	billingMonth?: string;
	startDate?: string;
	endDate?: string;
	search?: string;
}

export interface CustomExpenseChartQuery {
	billingMonth: string;
	startDate?: string;
	endDate?: string;
	search?: string;
}
