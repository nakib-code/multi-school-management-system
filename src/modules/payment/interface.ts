export type ManualPaymentMethod = "BKASH" | "NAGAD" | "ROCKET";
export type ManualPaymentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface ManualPaymentSubmissionInput {
	paymentMethod: ManualPaymentMethod;
	senderNumber: string;
	receiverNumber?: string;
	trxId: string;
	paidAmount: number;
	remarks?: string;
}

export interface RejectManualPaymentInput {
	rejectionReason: string;
}
