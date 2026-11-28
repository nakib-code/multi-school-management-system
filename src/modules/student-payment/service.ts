import {
	FeeStatus,
	PaymentMethod,
	PaymentStatus,
	SequenceDocumentType,
	UserRole,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { generateNextDocumentNumber } from "../../utils/documentSequence.js";
import { normalizeTrxId } from "../payment/service.js";
import type {
	CreateStudentPaymentInput,
	RejectStudentPaymentInput,
	StudentPaymentFilterQuery,
} from "./interface.js";

const studentPaymentInclude = {
	student: {
		select: { id: true, studentId: true, firstName: true, lastName: true },
	},
	fee: {
		select: {
			id: true,
			title: true,
			feeType: true,
			amount: true,
			status: true,
		},
	},
	verifiedBy: {
		select: { id: true, name: true, role: true },
	},
};

const getSchoolConfiguredReceiverNumber = async (
	schoolId: number,
	method: PaymentMethod,
): Promise<string | undefined> => {
	const setting = await prisma.schoolSetting.findUnique({
		where: { schoolId },
		select: {
			bkashNumber: true,
			nagadNumber: true,
			rocketNumber: true,
		},
	});

	if (!setting) return undefined;

	if (method === PaymentMethod.BKASH) return setting.bkashNumber ?? undefined;
	if (method === PaymentMethod.NAGAD) return setting.nagadNumber ?? undefined;
	if (method === PaymentMethod.ROCKET) return setting.rocketNumber ?? undefined;
	return undefined;
};

export const submitStudentPayment = async (
	schoolId: number,
	requester: { userId: number; role: UserRole },
	payload: CreateStudentPaymentInput,
) => {
	// Enforce ownership for GUARDIAN and STUDENT submitters
	if (requester.role === UserRole.GUARDIAN) {
		const guardian = await prisma.guardian.findFirst({
			where: { userId: requester.userId, schoolId },
		});
		if (!guardian) {
			throw new AppError(403, "Guardian profile not found in this school");
		}
		const link = await prisma.guardianStudent.findUnique({
			where: {
				guardianId_studentId: {
					guardianId: guardian.id,
					studentId: payload.studentId,
				},
			},
		});
		if (!link) {
			throw new AppError(
				403,
				"You can only submit payments for your linked students",
			);
		}
	} else if (requester.role === UserRole.STUDENT) {
		const ownStudent = await prisma.student.findFirst({
			where: { userId: requester.userId, schoolId },
		});
		if (!ownStudent || ownStudent.id !== payload.studentId) {
			throw new AppError(403, "You can only submit payments for yourself");
		}
	}

	const fee = await prisma.studentFee.findFirst({
		where: {
			id: payload.feeId,
			schoolId,
			studentId: payload.studentId,
		},
	});
	if (!fee) {
		throw new AppError(404, "Student fee not found for this student");
	}

	if (fee.status === FeeStatus.PAID || fee.status === FeeStatus.WAIVED) {
		throw new AppError(400, "This student fee is already settled");
	}

	if (payload.paymentMethod === PaymentMethod.CASH) {
		if (
			requester.role !== UserRole.ADMIN &&
			requester.role !== UserRole.MANAGER
		) {
			throw new AppError(
				403,
				"Only School Admins and Managers can record cash counter payments",
			);
		}

		const cashTrxId = payload.trxId?.trim()
			? normalizeTrxId(payload.trxId)
			: `CASH-${schoolId}-${fee.id}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

		try {
			return await prisma.$transaction(async (tx) => {
				const currentFee = await tx.studentFee.findFirst({
					where: { id: fee.id, schoolId, studentId: payload.studentId },
				});
				if (!currentFee) {
					throw new AppError(404, "Student fee not found for this student");
				}
				if (
					currentFee.status === FeeStatus.PAID ||
					currentFee.status === FeeStatus.WAIVED
				) {
					throw new AppError(400, "This student fee is already settled");
				}

				const now = new Date();
				const paidAtDate = payload.paidAt ?? now;
				const receiptNo = await generateNextDocumentNumber(
					tx,
					schoolId,
					SequenceDocumentType.FEE_RECEIPT,
					paidAtDate,
				);
				const payment = await tx.studentPayment.create({
					data: {
						schoolId,
						studentId: payload.studentId,
						feeId: payload.feeId,
						paymentMethod: PaymentMethod.CASH,
						senderNumber: payload.senderNumber?.trim() || "OFFICE-CASH",
						receiverNumber: "OFFICE-COUNTER",
						trxId: cashTrxId,
						receiptNo,
						paidAmount: payload.paidAmount,
						status: PaymentStatus.VERIFIED,
						verifiedById: requester.userId,
						verifiedAt: now,
						paidAt: paidAtDate,
						...(payload.remarks !== undefined
							? { remarks: payload.remarks }
							: {}),
					},
					include: studentPaymentInclude,
				});

				const verifiedSum = await tx.studentPayment.aggregate({
					where: { feeId: currentFee.id, status: PaymentStatus.VERIFIED },
					_sum: { paidAmount: true },
				});

				const totalVerifiedPaid = Number(verifiedSum._sum.paidAmount ?? 0);
				const feeAmount = Number(currentFee.amount);
				const waivedAmount = Number(currentFee.waivedAmount ?? 0);
				const netPayable = Math.max(0, feeAmount - waivedAmount);
				const nextFeeStatus =
					totalVerifiedPaid >= netPayable
						? FeeStatus.PAID
						: totalVerifiedPaid > 0
							? FeeStatus.PARTIAL
							: FeeStatus.PENDING;

				await tx.studentFee.update({
					where: { id: currentFee.id },
					data: { status: nextFeeStatus },
				});

				return payment;
			});
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "P2002"
			) {
				throw new AppError(
					409,
					"This transaction ID (trxId) has already been submitted",
				);
			}
			throw error;
		}
	}

	if (
		(payload.paymentMethod === PaymentMethod.BANK_TRANSFER ||
			payload.paymentMethod === PaymentMethod.CHEQUE) &&
		requester.role !== UserRole.ADMIN &&
		requester.role !== UserRole.MANAGER
	) {
		throw new AppError(
			403,
			"Only School Admins and Managers can record bank transfer or cheque payments",
		);
	}

	const isMfsMethod =
		payload.paymentMethod === PaymentMethod.BKASH ||
		payload.paymentMethod === PaymentMethod.NAGAD ||
		payload.paymentMethod === PaymentMethod.ROCKET;
	if (isMfsMethod && !(payload.senderNumber ?? "").trim()) {
		throw new AppError(
			400,
			"Sender mobile number is required for mobile financial service payments",
		);
	}

	const normalizedTrxId = normalizeTrxId(payload.trxId ?? "");

	// Duplicate TrxID protection for active (non-REJECTED) student payments within the same school
	const existingTrx = await prisma.studentPayment.findFirst({
		where: {
			schoolId,
			trxId: normalizedTrxId,
			status: { not: PaymentStatus.REJECTED },
		},
		select: { id: true },
	});
	if (existingTrx) {
		throw new AppError(
			409,
			"This transaction ID (trxId) has already been submitted",
		);
	}

	const receiverNumber =
		payload.receiverNumber ??
		(await getSchoolConfiguredReceiverNumber(schoolId, payload.paymentMethod));

	try {
		return await prisma.studentPayment.create({
			data: {
				schoolId,
				studentId: payload.studentId,
				feeId: payload.feeId,
				paymentMethod: payload.paymentMethod,
				senderNumber: (payload.senderNumber ?? "").trim(),
				...(receiverNumber !== undefined ? { receiverNumber } : {}),
				trxId: normalizedTrxId,
				paidAmount: payload.paidAmount,
				status: PaymentStatus.PENDING,
				...(payload.paidAt !== undefined ? { paidAt: payload.paidAt } : {}),
				...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
			},
			include: studentPaymentInclude,
		});
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "P2002"
		) {
			throw new AppError(
				409,
				"This transaction ID (trxId) has already been submitted",
			);
		}
		throw error;
	}
};

export const getStudentPayments = async (
	schoolId: number,
	query: StudentPaymentFilterQuery,
	allowedStudentIds?: number[] | null,
) => {
	if (allowedStudentIds !== null && allowedStudentIds !== undefined) {
		if (allowedStudentIds.length === 0) return [];
		if (
			query.studentId !== undefined &&
			!allowedStudentIds.includes(query.studentId)
		) {
			return [];
		}
	}

	return prisma.studentPayment.findMany({
		where: {
			schoolId,
			...(allowedStudentIds !== null && allowedStudentIds !== undefined
				? {
						studentId:
							query.studentId !== undefined
								? query.studentId
								: { in: allowedStudentIds },
					}
				: query.studentId !== undefined
					? { studentId: query.studentId }
					: {}),
			...(query.feeId !== undefined ? { feeId: query.feeId } : {}),
			...(query.paymentMethod !== undefined
				? { paymentMethod: query.paymentMethod }
				: {}),
			...(query.status !== undefined ? { status: query.status } : {}),
		},
		include: studentPaymentInclude,
		orderBy: { createdAt: "desc" },
	});
};

export const getStudentPaymentById = async (schoolId: number, id: number) => {
	const payment = await prisma.studentPayment.findFirst({
		where: { id, schoolId },
		include: studentPaymentInclude,
	});
	if (!payment) throw new AppError(404, "Student payment not found");
	return payment;
};

export const verifyStudentPayment = async (
	schoolId: number,
	id: number,
	verifierUserId: number,
) => {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.studentPayment.findFirst({
			where: { id, schoolId },
			include: { fee: true },
		});
		if (!existing) throw new AppError(404, "Student payment not found");

		if (existing.status === PaymentStatus.VERIFIED) {
			throw new AppError(400, "Student payment is already verified");
		}
		if (existing.status !== PaymentStatus.PENDING) {
			throw new AppError(400, "Only pending student payments can be verified");
		}
		if (existing.fee.status === FeeStatus.WAIVED) {
			throw new AppError(
				400,
				"Cannot verify payment for a waived fee invoice. Please reject this payment instead.",
			);
		}

		const priorVerifiedSum = await tx.studentPayment.aggregate({
			where: { feeId: existing.feeId, status: PaymentStatus.VERIFIED },
			_sum: { paidAmount: true },
		});
		const priorVerifiedPaid = Number(priorVerifiedSum._sum.paidAmount ?? 0);
		const feeAmount = Number(existing.fee.amount);
		const waivedAmount = Number(existing.fee.waivedAmount ?? 0);
		const netPayable = Math.max(0, feeAmount - waivedAmount);
		const remainingDue = Math.max(
			0,
			Number((netPayable - priorVerifiedPaid).toFixed(2)),
		);
		const paymentAmount = Number(existing.paidAmount);

		if (existing.fee.status === FeeStatus.PAID || remainingDue <= 0) {
			throw new AppError(
				400,
				"Cannot verify payment because this fee invoice has no remaining due balance. Please reject duplicate payments instead.",
			);
		}
		if (paymentAmount > remainingDue + 0.009) {
			throw new AppError(
				400,
				`Cannot verify payment of ৳${paymentAmount} because it exceeds the remaining due balance of ৳${remainingDue}`,
			);
		}

		const verifiedAt = new Date();
		const receiptNo =
			existing.receiptNo ??
			(await generateNextDocumentNumber(
				tx,
				schoolId,
				SequenceDocumentType.FEE_RECEIPT,
				existing.paidAt ?? verifiedAt,
			));

		const claimed = await tx.studentPayment.updateMany({
			where: { id, schoolId, status: PaymentStatus.PENDING },
			data: {
				status: PaymentStatus.VERIFIED,
				verifiedById: verifierUserId,
				verifiedAt,
				receiptNo,
				rejectionReason: null,
			},
		});

		if (claimed.count === 0) {
			throw new AppError(
				409,
				"Student payment was already processed by another request",
			);
		}

		const updatedPayment = await tx.studentPayment.findUniqueOrThrow({
			where: { id },
			include: studentPaymentInclude,
		});

		const verifiedSum = await tx.studentPayment.aggregate({
			where: { feeId: existing.feeId, status: PaymentStatus.VERIFIED },
			_sum: { paidAmount: true },
		});

		const totalVerifiedPaid = Number(verifiedSum._sum.paidAmount ?? 0);
		if (totalVerifiedPaid > netPayable + 0.009) {
			throw new AppError(
				409,
				"Verifying this payment would exceed the fee invoice's remaining due balance due to a concurrent verification",
			);
		}

		const nextFeeStatus =
			totalVerifiedPaid >= netPayable
				? FeeStatus.PAID
				: totalVerifiedPaid > 0
					? FeeStatus.PARTIAL
					: FeeStatus.PENDING;

		const updatedFee = await tx.studentFee.update({
			where: { id: existing.feeId },
			data: { status: nextFeeStatus },
		});

		return {
			payment: updatedPayment,
			feeBalance: {
				feeId: updatedFee.id,
				feeAmount,
				waivedAmount,
				totalVerifiedPaid,
				remainingBalance: Math.max(0, netPayable - totalVerifiedPaid),
				feeStatus: updatedFee.status,
			},
		};
	});
};

export const rejectStudentPayment = async (
	schoolId: number,
	id: number,
	verifierUserId: number,
	payload: RejectStudentPaymentInput,
) => {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.studentPayment.findFirst({
			where: { id, schoolId },
		});
		if (!existing) throw new AppError(404, "Student payment not found");

		if (existing.status === PaymentStatus.VERIFIED) {
			throw new AppError(400, "Verified student payments cannot be rejected");
		}
		if (existing.status !== PaymentStatus.PENDING) {
			throw new AppError(400, "Only pending student payments can be rejected");
		}

		const claimed = await tx.studentPayment.updateMany({
			where: { id, schoolId, status: PaymentStatus.PENDING },
			data: {
				status: PaymentStatus.REJECTED,
				verifiedById: verifierUserId,
				verifiedAt: new Date(),
				rejectionReason: payload.rejectionReason.trim(),
			},
		});

		if (claimed.count === 0) {
			throw new AppError(
				409,
				"Student payment was already processed by another request",
			);
		}

		return tx.studentPayment.findUniqueOrThrow({
			where: { id },
			include: studentPaymentInclude,
		});
	});
};
