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

// ====================================================
// PAYMENT SUMMARY
// ====================================================

export interface SubscriptionPaymentSummary {
        totalRevenue: number;
        onlineRevenue: number;
        cashRevenue: number;
        pendingCashAmount: number;

        totalPayments: number;
        paidPayments: number;
        pendingPayments: number;
        failedPayments: number;
        cancelledPayments: number;
}

// ====================================================
// PAYMENT HISTORY
// ====================================================

export interface SubscriptionPaymentHistoryItem {
        id: number;
        subscriptionId: number;
        schoolId: number;

        amount: number;
        currency: string;

        status: string;
        paymentMethod: string;

        transactionId: string | null;
        validationId: string | null;

        paidAt: Date | null;
        createdAt: Date;

        school: {
                id: number;
                name: string;
                code: string;
        };

        subscription: {
                id: number;
                status: string;

                package: {
                        id: number;
                        name: string;
                        price: number;
                        billingCycle: string;
                };
        };
}