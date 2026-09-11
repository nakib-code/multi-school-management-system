export interface InitiatePaymentInput {
	amount: number;
	transactionId: string;
	productName: string;
	productCategory: string;

	customerName: string;
	customerEmail: string;
	customerPhone?: string;

	customerAddress?: string;
	customerCity?: string;
	customerCountry?: string;

	successUrl: string;
	failUrl: string;
	cancelUrl: string;
	ipnUrl: string;

	valueA?: string;
	valueB?: string;
	valueC?: string;
	valueD?: string;
}

export interface InitiatePaymentResult {
	transactionId: string;
	amount: number;
	paymentUrl: string | null;
}

export interface SSLCommerzValidationResponse {
	status?: string;
	tran_date?: string;
	tran_id?: string;
	val_id?: string;
	amount?: string;
	store_amount?: string;
	currency?: string;
	currency_type?: string;
	bank_tran_id?: string;
	card_type?: string;
	card_no?: string;
	risk_title?: string;
	risk_level?: string;
	value_a?: string;
	value_b?: string;
	value_c?: string;
	value_d?: string;
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
