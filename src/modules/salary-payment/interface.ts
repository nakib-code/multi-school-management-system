import type {
	SalaryPaymentMethod,
	SalaryPaymentStatus,
} from "../../generated/prisma/client.js";

export interface CreateSalaryPaymentInput {
	teacherId: number;
	salaryId: number;
	transactionId?: string;
	amount: number;
	paymentMethod: SalaryPaymentMethod;
	status?: SalaryPaymentStatus;
	paidAt?: Date;
	remarks?: string;
}

export interface UpdateSalaryPaymentInput {
	status?: SalaryPaymentStatus;
	remarks?: string | null;
}

export interface SalaryPaymentFilterQuery {
	teacherId?: number;
	salaryId?: number;
	paymentMethod?: SalaryPaymentMethod;
	status?: SalaryPaymentStatus;
}
