import type { NextFunction, Response } from "express";

import { PaymentMethod } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import { resolveScopedStudentIds } from "../../utils/ownershipScope.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordSchoolAudit } from "../audit-log/service.js";
import { createNotification } from "../notification/service.js";
import type { StudentPaymentFilterQuery } from "./interface.js";
import {
	getStudentPaymentById,
	getStudentPayments,
	rejectStudentPayment,
	submitStudentPayment,
	verifyStudentPayment,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

const notifyStudentAndGuardians = async (
	schoolId: number,
	studentId: number,
	title: string,
	message: string,
) => {
	try {
		const [student, links] = await Promise.all([
			prisma.student.findFirst({
				where: { id: studentId, schoolId },
				select: { userId: true },
			}),
			prisma.guardianStudent.findMany({
				where: { studentId, guardian: { schoolId } },
				select: { guardian: { select: { userId: true } } },
			}),
		]);

		const recipientIds = new Set<number>();
		if (student?.userId) recipientIds.add(student.userId);
		for (const link of links) {
			if (link.guardian.userId) recipientIds.add(link.guardian.userId);
		}

		await Promise.all(
			[...recipientIds].map((recipientId) =>
				createNotification({
					recipientId,
					schoolId,
					type: "FEE",
					title,
					message,
				}).catch(() => {}),
			),
		);
	} catch {
		// Non-fatal notification failure
	}
};

export const submitStudentPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await submitStudentPayment(
			schoolId,
			{ userId: req.user.userId, role: req.user.role },
			req.body,
		);

		const isCash = result.paymentMethod === PaymentMethod.CASH;
		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: isCash ? "APPROVE" : "CREATE",
			entity: "StudentPayment",
			entityId: result.id,
			description: isCash
				? `Recorded counter CASH payment #${result.id} (৳${Number(result.paidAmount)})`
				: `Submitted ${result.paymentMethod} fee payment #${result.id} (${result.trxId})`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});

		if (isCash) {
			await notifyStudentAndGuardians(
				schoolId,
				result.studentId,
				"Cash Fee Payment Recorded",
				`Your cash payment of ৳${Number(result.paidAmount)} for ${result.fee.title} has been received and verified.`,
			);
		} else {
			const staff = await prisma.user.findMany({
				where: {
					schoolId,
					role: { in: ["ADMIN", "MANAGER"] },
					status: "ACTIVE",
				},
				select: { id: true },
			});
			await Promise.all(
				staff.map((u) =>
					createNotification({
						recipientId: u.id,
						schoolId,
						type: "FEE",
						title: "New Student Fee Payment Submitted",
						message: `${result.student.firstName} ${result.student.lastName ?? ""} submitted ৳${Number(result.paidAmount)} via ${result.paymentMethod} (TrxID: ${result.trxId}).`,
					}).catch(() => {}),
				),
			);
		}

		return sendResponse(res, {
			statusCode: 201,
			message: isCash
				? "Cash payment recorded and verified successfully"
				: "Manual student payment submitted and pending verification",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentPaymentsController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: StudentPaymentFilterQuery }
			| undefined;
		const allowedStudentIds = req.user
			? await resolveScopedStudentIds(schoolId, req.user)
			: null;
		const result = await getStudentPayments(
			schoolId,
			validated?.query ?? {},
			allowedStudentIds,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payments retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentPaymentByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student payment ID");
		const result = await getStudentPaymentById(schoolId, id);
		if (req.user) {
			const allowedStudentIds = await resolveScopedStudentIds(
				schoolId,
				req.user,
			);
			if (
				allowedStudentIds !== null &&
				!allowedStudentIds.includes(result.studentId)
			) {
				throw new AppError(
					403,
					"You do not have permission to view this payment",
				);
			}
		}
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payment retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const verifyStudentPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student payment ID");
		const result = await verifyStudentPayment(schoolId, id, req.user.userId);
		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "APPROVE",
			entity: "StudentPayment",
			entityId: id,
			description: `Verified student fee payment #${id}`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});
		await notifyStudentAndGuardians(
			schoolId,
			result.payment.studentId,
			"Fee Payment Verified",
			`Your ${result.payment.paymentMethod} payment of ৳${Number(result.payment.paidAmount)} (TrxID: ${result.payment.trxId}) for ${result.payment.fee.title} has been verified.`,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payment verified successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const rejectStudentPaymentController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) throw new AppError(401, "Authentication required");
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student payment ID");
		const result = await rejectStudentPayment(
			schoolId,
			id,
			req.user.userId,
			req.body,
		);
		await recordSchoolAudit({
			schoolId,
			userId: req.user.userId,
			action: "REJECT",
			entity: "StudentPayment",
			entityId: id,
			description: `Rejected student fee payment #${id}`,
			ipAddress: req.ip ?? null,
			userAgent: req.headers["user-agent"] ?? null,
		}).catch(() => {});
		await notifyStudentAndGuardians(
			schoolId,
			result.studentId,
			"Fee Payment Rejected",
			`Your ${result.paymentMethod} payment (${result.trxId}) for ${result.fee.title} was rejected. Reason: ${result.rejectionReason ?? "Please contact the school office."}`,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student payment rejected successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
