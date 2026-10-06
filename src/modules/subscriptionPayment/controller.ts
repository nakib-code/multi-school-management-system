import type { Response } from "express";

import type { AuthRequest } from "../../middleware/auth.js";

import AppError from "../../utils/appError.js";

import sendResponse from "../../utils/sendResponse.js";

import {
    approveCashSubscriptionPayment,
    getPendingCashPayments,
    getSubscriptionPaymentCallbackData,
    getSubscriptionPaymentHistory,
    getSubscriptionPaymentSummary,
    initiateSubscriptionPayment,
    processCancelledSubscriptionPayment,
    processFailedSubscriptionPayment,
    processSuccessfulSubscriptionPayment,
    rejectCashSubscriptionPayment,
    requestCashSubscriptionPayment,
} from "./service.js";

// ====================================================
// Helpers
// ====================================================

const getFrontendUrl = () => {
    return (
        process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
};

const getPositiveIntegerParam = (
    value: string | number | string[] | undefined,
    name: string,
): number => {
    if (Array.isArray(value) || value === undefined) {
        throw new AppError(400, `Invalid ${name}`);
    }

    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(400, `Invalid ${name}`);
    }

    return id;
};

// ====================================================
// ONLINE PAYMENT
// ====================================================

/**
 * Admin - Initiate Online Subscription Payment
 */
export const initiateSubscriptionPaymentController = async (
    req: AuthRequest,
    res: Response,
) => {
    if (!req.user) {
        throw new AppError(401, "Authentication required");
    }

    if (req.user.schoolId === undefined) {
        throw new AppError(
            403,
            "You are not associated with any school",
        );
    }

    const subscriptionId = getPositiveIntegerParam(
        req.params.subscriptionId,
        "subscription ID",
    );

    const result = await initiateSubscriptionPayment(
        subscriptionId,
        req.user.schoolId,
    );

    return sendResponse(res, {
        statusCode: 200,
        message: "Subscription payment initialized successfully",
        data: result,
    });
};

// ====================================================
// SSLCOMMERZ CALLBACKS
// ====================================================

/**
 * SSLCommerz - Success Callback
 *
 * This endpoint must remain public because
 * SSLCommerz calls it directly.
 */
export const subscriptionPaymentSuccessController = async (
    req: AuthRequest,
    res: Response,
) => {
    const callbackData = getSubscriptionPaymentCallbackData(
        req.body,
    );

    const payment =
        await processSuccessfulSubscriptionPayment(callbackData);

    const frontendUrl = getFrontendUrl();

    return res.redirect(
        `${frontendUrl}/dashboard/admin/subscription/payment/success?subscriptionId=${payment.subscriptionId}&paymentId=${payment.id}`,
    );
};

/**
 * SSLCommerz - Failed Callback
 */
export const subscriptionPaymentFailController = async (
    req: AuthRequest,
    res: Response,
) => {
    const callbackData = getSubscriptionPaymentCallbackData(
        req.body,
    );

    const payment =
        await processFailedSubscriptionPayment(callbackData);

    const frontendUrl = getFrontendUrl();

    return res.redirect(
        `${frontendUrl}/dashboard/admin/subscription/payment/failed?subscriptionId=${payment.subscriptionId}&paymentId=${payment.id}`,
    );
};

/**
 * SSLCommerz - Cancel Callback
 */
export const subscriptionPaymentCancelController = async (
    req: AuthRequest,
    res: Response,
) => {
    const callbackData = getSubscriptionPaymentCallbackData(
        req.body,
    );

    const payment =
        await processCancelledSubscriptionPayment(callbackData);

    const frontendUrl = getFrontendUrl();

    return res.redirect(
        `${frontendUrl}/dashboard/admin/subscription/payment/cancelled?subscriptionId=${payment.subscriptionId}&paymentId=${payment.id}`,
    );
};

/**
 * SSLCommerz - IPN
 *
 * IPN can arrive independently of the success callback.
 * The service handles idempotency.
 */
export const subscriptionPaymentIpnController = async (
    req: AuthRequest,
    res: Response,
) => {
    const callbackData = getSubscriptionPaymentCallbackData(
        req.body,
    );

    const payment =
        await processSuccessfulSubscriptionPayment(callbackData);

    return sendResponse(res, {
        statusCode: 200,
        message: "Subscription payment IPN processed successfully",
        data: {
            paymentId: payment.id,
            subscriptionId: payment.subscriptionId,
            status: payment.status,
            transactionId: payment.transactionId,
            paidAt: payment.paidAt,
        },
    });
};

// ====================================================
// CASH PAYMENT
// ====================================================

/**
 * Admin - Request Cash Subscription Payment
 */
export const requestCashSubscriptionPaymentController = async (
    req: AuthRequest,
    res: Response,
) => {
    if (!req.user) {
        throw new AppError(401, "Authentication required");
    }

    if (req.user.schoolId === undefined) {
        throw new AppError(
            403,
            "You are not associated with any school",
        );
    }

    const subscriptionId = getPositiveIntegerParam(
        req.params.subscriptionId,
        "subscription ID",
    );

    const result = await requestCashSubscriptionPayment(
        subscriptionId,
        req.user.schoolId,
    );

    return sendResponse(res, {
        statusCode: 201,
        message: "Cash payment request submitted successfully",
        data: result,
    });
};

// ====================================================
// SUPER ADMIN - CASH PAYMENT MANAGEMENT
// ====================================================

/**
 * Super Admin - Get Pending Cash Payments
 */
export const getPendingCashPaymentsController = async (
    _req: AuthRequest,
    res: Response,
) => {
    const result = await getPendingCashPayments();

    return sendResponse(res, {
        statusCode: 200,
        message: "Pending cash payments retrieved successfully",
        data: result,
    });
};

/**
 * Super Admin - Approve Cash Payment
 */
export const approveCashSubscriptionPaymentController = async (
    req: AuthRequest,
    res: Response,
) => {
    const paymentId = getPositiveIntegerParam(
        req.params.paymentId,
        "payment ID",
    );

    const remarks =
        typeof req.body?.remarks === "string"
            ? req.body.remarks.trim()
            : undefined;

    const result = await approveCashSubscriptionPayment(
        paymentId,
        remarks,
    );

    return sendResponse(res, {
        statusCode: 200,
        message: "Cash payment approved successfully",
        data: {
            paymentId: result.id,
            subscriptionId: result.subscriptionId,
            schoolId: result.schoolId,
            amount: Number(result.amount),
            currency: result.currency,
            status: result.status,
            paymentMethod: result.paymentMethod,
            paidAt: result.paidAt,
            remarks: result.remarks,
        },
    });
};

/**
 * Super Admin - Reject Cash Payment
 */
export const rejectCashSubscriptionPaymentController = async (
    req: AuthRequest,
    res: Response,
) => {
    const paymentId = getPositiveIntegerParam(
        req.params.paymentId,
        "payment ID",
    );

    const remarks =
        typeof req.body?.remarks === "string"
            ? req.body.remarks.trim()
            : undefined;

    const result = await rejectCashSubscriptionPayment(
        paymentId,
        remarks,
    );

    return sendResponse(res, {
        statusCode: 200,
        message: "Cash payment rejected successfully",
        data: {
            paymentId: result.id,
            subscriptionId: result.subscriptionId,
            schoolId: result.schoolId,
            amount: Number(result.amount),
            currency: result.currency,
            status: result.status,
            paymentMethod: result.paymentMethod,
            paidAt: result.paidAt,
            remarks: result.remarks,
        },
    });
};



// ====================================================
// SUPER ADMIN - PAYMENT SUMMARY
// ====================================================

export const getSubscriptionPaymentSummaryController = async (
        req: AuthRequest,
        res: Response,
) => {
        if (!req.user) {
                throw new AppError(401, "Authentication required");
        }

        const summary = await getSubscriptionPaymentSummary();

        return sendResponse(res, {
                statusCode: 200,
                message: "Payment summary retrieved successfully",
                data: summary,
        });
};

// ====================================================
// SUPER ADMIN - PAYMENT HISTORY
// ====================================================

export const getSubscriptionPaymentHistoryController = async (
        req: AuthRequest,
        res: Response,
) => {
        if (!req.user) {
                throw new AppError(401, "Authentication required");
        }

        const history = await getSubscriptionPaymentHistory();

        return sendResponse(res, {
                statusCode: 200,
                message: "Payment history retrieved successfully",
                data: history,
        });
};