import type {
	SubscriptionPaymentMethod,
	SubscriptionPaymentStatus,
} from "../../generated/prisma/client.js";

export interface SubmitSubscriptionPaymentInput {
	paymentMethod: SubscriptionPaymentMethod;
	senderNumber: string;
	receiverNumber?: string;
	trxId: string;
	paidAmount: number;
	paidAt?: Date;
	remarks?: string;
}

export interface RejectSubscriptionPaymentInput {
	rejectionReason: string;
}

export interface SubscriptionPaymentFilterQuery {
	schoolId?: number;
	subscriptionId?: number;
	paymentMethod?: SubscriptionPaymentMethod;
	status?: SubscriptionPaymentStatus;
}

export interface SubscriptionPaymentSummary {
	totalRevenue: number;
	bkashRevenue: number;
	nagadRevenue: number;
	rocketRevenue: number;
	pendingAmount: number;
	totalPayments: number;
	verifiedPayments: number;
	pendingPayments: number;
	rejectedPayments: number;
}
