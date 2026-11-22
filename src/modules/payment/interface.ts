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

export interface PaymentCallbackData {
	status?: string;
	tran_id?: string;
	val_id?: string;
	amount?: string;
	currency?: string;
	value_a?: string;
	value_b?: string;
	value_c?: string;
	value_d?: string;
}
