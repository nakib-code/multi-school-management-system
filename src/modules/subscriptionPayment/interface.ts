export interface InitiateSubscriptionPaymentInput {
	subscriptionId: number;
}

export interface InitiateSubscriptionPaymentResult {
	paymentId: number;
	subscriptionId: number;
	transactionId: string;
	amount: number;
	currency: string;
	paymentUrl: string;
}

export interface SubscriptionPaymentCallbackData {
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
