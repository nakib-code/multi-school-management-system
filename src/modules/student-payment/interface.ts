import type {
	PaymentMethod,
	PaymentStatus,
} from "../../generated/prisma/client.js";

export interface CreateStudentPaymentInput {
	studentId: number;
	feeId: number;
	paymentMethod: PaymentMethod;
	senderNumber: string;
	receiverNumber?: string;
	trxId: string;
	paidAmount: number;
	paidAt?: Date;
	remarks?: string;
}

export interface RejectStudentPaymentInput {
	rejectionReason: string;
}

export interface StudentPaymentFilterQuery {
	studentId?: number;
	feeId?: number;
	paymentMethod?: PaymentMethod;
	status?: PaymentStatus;
}
