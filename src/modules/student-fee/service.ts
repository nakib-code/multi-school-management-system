import {
	type DiscountMode,
	FeeStatus,
	PaymentStatus,
	Prisma,
	type StudentConcessionType,
	UserRole,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { getDhakaStartOfToday, roundMoney } from "../../utils/dhakaDate.js";
import { resolveClassFeeAmount } from "../class/service.js";
import type {
	BulkCreateStudentFeeInput,
	CreateStudentFeeInput,
	StudentFeeFilterQuery,
	UpdateStudentFeeInput,
} from "./interface.js";

const studentFeeInclude = {
	student: {
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			concessionType: true,
			concessionMode: true,
			concessionValue: true,
			concessionReason: true,
		},
	},
	enrollment: {
		select: {
			id: true,
			academicYear: true,
			rollNumber: true,
			classId: true,
			sectionId: true,
			class: { select: { id: true, name: true, code: true } },
			section: { select: { id: true, name: true } },
		},
	},
	exam: {
		select: { id: true, name: true, type: true },
	},
	waivedBy: {
		select: { id: true, name: true, role: true },
	},
	payments: {
		select: {
			id: true,
			trxId: true,
			receiptNo: true,
			paidAmount: true,
			paymentMethod: true,
			senderNumber: true,
			receiverNumber: true,
			status: true,
			paidAt: true,
			verifiedAt: true,
			rejectionReason: true,
		},
	},
};

export interface StudentConcessionProfile {
	concessionType?: StudentConcessionType | null;
	concessionMode?: DiscountMode | null;
	concessionValue?: number | Prisma.Decimal | null;
	concessionReason?: string | null;
}

/**
 * Pure helper: computes net billed amount after applying a student's concession/scholarship profile.
 */
export const computeConcessionDiscount = (
	grossAmount: number,
	profile?: StudentConcessionProfile | null,
): {
	grossAmount: number;
	concessionAmount: number;
	netAmount: number;
	concessionType: StudentConcessionType | null;
	concessionReason: string | null;
} => {
	const safeGross = roundMoney(Math.max(0, grossAmount));
	if (
		!profile ||
		!profile.concessionType ||
		!profile.concessionMode ||
		profile.concessionValue === null ||
		profile.concessionValue === undefined
	) {
		return {
			grossAmount: safeGross,
			concessionAmount: 0,
			netAmount: safeGross,
			concessionType: null,
			concessionReason: null,
		};
	}

	const rawVal = Number(profile.concessionValue);
	if (!Number.isFinite(rawVal) || rawVal <= 0) {
		return {
			grossAmount: safeGross,
			concessionAmount: 0,
			netAmount: safeGross,
			concessionType: null,
			concessionReason: null,
		};
	}

	const discount =
		profile.concessionMode === "PERCENTAGE"
			? roundMoney((safeGross * Math.min(100, rawVal)) / 100)
			: roundMoney(Math.min(safeGross, rawVal));

	const clampedDiscount = roundMoney(
		Math.min(safeGross, Math.max(0, discount)),
	);
	const netAmount = roundMoney(Math.max(0, safeGross - clampedDiscount));

	return {
		grossAmount: safeGross,
		concessionAmount: clampedDiscount,
		netAmount,
		concessionType: profile.concessionType,
		concessionReason: profile.concessionReason ?? null,
	};
};

export interface FeeFinancialSummary {
	billed: number;
	paid: number;
	waived: number;
	due: number;
	isOverdue: boolean;
	effectiveStatus: FeeStatus;
}

/**
 * Pure helper: computes consistent billed/paid/waived/due and automated OVERDUE status
 * without wiping out already-verified payments when a partial or full waiver is applied.
 */
export const computeFeeFinancials = (
	fee: {
		amount: number | Prisma.Decimal;
		waivedAmount?: number | Prisma.Decimal | null;
		status: FeeStatus;
		dueDate?: Date | string | null;
		payments?: Array<{
			paidAmount: number | Prisma.Decimal;
			status?: PaymentStatus;
		}>;
	},
	now: Date = new Date(),
): FeeFinancialSummary => {
	const billed = roundMoney(Math.max(0, Number(fee.amount)));
	const verifiedPaid = roundMoney(
		(fee.payments ?? [])
			.filter(
				(p) => p.status === undefined || p.status === PaymentStatus.VERIFIED,
			)
			.reduce((sum, p) => sum + Number(p.paidAmount), 0),
	);

	// Preserve legacy manually-marked PAID invoices that have no StudentPayment rows
	const paid =
		fee.status === FeeStatus.PAID && verifiedPaid === 0
			? billed
			: roundMoney(Math.min(billed, verifiedPaid));

	const rawExplicitWaived = roundMoney(
		Math.max(0, Number(fee.waivedAmount ?? 0)),
	);
	const maxWaivable = roundMoney(Math.max(0, billed - paid));
	const waived =
		fee.status === FeeStatus.WAIVED
			? roundMoney(
					Math.max(Math.min(maxWaivable, rawExplicitWaived), maxWaivable),
				)
			: roundMoney(Math.min(maxWaivable, rawExplicitWaived));

	const due = roundMoney(Math.max(0, billed - paid - waived));

	const dhakaTodayStart = getDhakaStartOfToday(now).getTime();
	const dueTime = fee.dueDate ? new Date(fee.dueDate).getTime() : Number.NaN;
	const pastDue = Number.isFinite(dueTime) && dueTime < dhakaTodayStart;

	const isOverdue =
		due > 0 &&
		fee.status !== FeeStatus.PAID &&
		fee.status !== FeeStatus.WAIVED &&
		(fee.status === FeeStatus.OVERDUE || pastDue);

	let effectiveStatus: FeeStatus;
	if (due === 0) {
		effectiveStatus =
			fee.status === FeeStatus.WAIVED && paid === 0
				? FeeStatus.WAIVED
				: paid === 0 && waived > 0
					? FeeStatus.WAIVED
					: FeeStatus.PAID;
	} else if (isOverdue) {
		effectiveStatus = FeeStatus.OVERDUE;
	} else if (paid > 0) {
		effectiveStatus = FeeStatus.PARTIAL;
	} else {
		effectiveStatus = FeeStatus.PENDING;
	}

	return {
		billed,
		paid,
		waived,
		due,
		isOverdue,
		effectiveStatus,
	};
};

const enrichFeeRecord = <
	T extends {
		amount: number | Prisma.Decimal;
		waivedAmount?: number | Prisma.Decimal | null;
		status: FeeStatus;
		dueDate: Date;
		payments?: Array<{
			paidAmount: number | Prisma.Decimal;
			status?: PaymentStatus;
		}>;
	},
>(
	fee: T,
	now: Date = new Date(),
) => {
	const fin = computeFeeFinancials(fee, now);
	return {
		...fee,
		status: fin.effectiveStatus,
		storedStatus: fee.status,
		isOverdue: fin.isOverdue,
		computedPaid: fin.paid,
		computedWaived: fin.waived,
		computedDue: fin.due,
	};
};

export const createStudentFee = async (
	schoolId: number,
	payload: CreateStudentFeeInput,
) => {
	const enrollment = await prisma.enrollment.findFirst({
		where: {
			id: payload.enrollmentId,
			schoolId,
			studentId: payload.studentId,
		},
		include: {
			student: {
				select: {
					concessionType: true,
					concessionMode: true,
					concessionValue: true,
					concessionReason: true,
				},
			},
		},
	});
	if (!enrollment) {
		throw new AppError(
			404,
			"Enrollment not found for this student in this school",
		);
	}

	const academicYear = payload.academicYear?.trim() || enrollment.academicYear;

	let resolvedAmount = payload.amount;
	if (resolvedAmount === undefined || payload.useClassDefaultAmount) {
		const classFee = await resolveClassFeeAmount(
			schoolId,
			enrollment.classId,
			payload.feeType,
			academicYear,
		);
		if (classFee.amount !== null && classFee.amount > 0) {
			resolvedAmount = resolvedAmount ?? classFee.amount;
			if (payload.useClassDefaultAmount && payload.amount === undefined) {
				resolvedAmount = classFee.amount;
			}
		}
	}

	if (resolvedAmount === undefined || resolvedAmount <= 0) {
		throw new AppError(
			400,
			`No default ${payload.feeType} fee is configured for this class. Please enter an amount.`,
		);
	}

	if (payload.examId !== undefined) {
		const exam = await prisma.exam.findFirst({
			where: { id: payload.examId, schoolId },
			select: { id: true },
		});
		if (!exam) {
			throw new AppError(404, "Selected exam was not found in this school");
		}
	}

	const shouldApplyConcession = payload.applyStudentConcession !== false;
	const concession = shouldApplyConcession
		? computeConcessionDiscount(resolvedAmount, enrollment.student)
		: {
				grossAmount: roundMoney(resolvedAmount),
				concessionAmount: 0,
				netAmount: roundMoney(resolvedAmount),
				concessionType: null,
				concessionReason: null,
			};

	const autoWaivedByConcession =
		concession.concessionAmount > 0 && concession.netAmount === 0;
	const finalStatus =
		payload.status ??
		(autoWaivedByConcession ? FeeStatus.WAIVED : FeeStatus.PENDING);

	const created = await prisma.studentFee.create({
		data: {
			schoolId,
			studentId: payload.studentId,
			enrollmentId: payload.enrollmentId,
			feeType: payload.feeType,
			title: payload.title.trim(),
			amount: new Prisma.Decimal(concession.netAmount.toFixed(2)),
			grossAmount: new Prisma.Decimal(concession.grossAmount.toFixed(2)),
			concessionAmount: new Prisma.Decimal(
				concession.concessionAmount.toFixed(2),
			),
			...(concession.concessionType
				? { concessionType: concession.concessionType }
				: {}),
			dueDate: payload.dueDate,
			academicYear,
			...(payload.billingMonth !== undefined
				? { billingMonth: payload.billingMonth }
				: {}),
			...(payload.examId !== undefined ? { examId: payload.examId } : {}),
			status: finalStatus,
			...(autoWaivedByConcession && concession.concessionReason
				? { waiverReason: concession.concessionReason }
				: {}),
			...(payload.description !== undefined
				? { description: payload.description.trim() }
				: {}),
		},
		include: studentFeeInclude,
	});

	return enrichFeeRecord(created);
};

export const getStudentFees = async (
	schoolId: number,
	query: StudentFeeFilterQuery,
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

	const hasEnrollmentFilter =
		query.classId !== undefined ||
		query.sectionId !== undefined ||
		query.academicYear !== undefined;

	const dhakaTodayStart = getDhakaStartOfToday();

	let statusWhere: Prisma.StudentFeeWhereInput = {};
	if (query.status === FeeStatus.OVERDUE) {
		statusWhere = {
			OR: [
				{ status: FeeStatus.OVERDUE },
				{
					status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
					dueDate: { lt: dhakaTodayStart },
				},
			],
		};
	} else if (query.status !== undefined) {
		statusWhere = { status: query.status };
	}

	const rows = await prisma.studentFee.findMany({
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
			...(query.enrollmentId !== undefined
				? { enrollmentId: query.enrollmentId }
				: {}),
			...(hasEnrollmentFilter
				? {
						enrollment: {
							...(query.classId !== undefined
								? { classId: query.classId }
								: {}),
							...(query.sectionId !== undefined
								? { sectionId: query.sectionId }
								: {}),
							...(query.academicYear !== undefined
								? { academicYear: query.academicYear }
								: {}),
						},
					}
				: {}),
			...(query.feeType !== undefined ? { feeType: query.feeType } : {}),
			...(query.billingMonth !== undefined
				? { billingMonth: query.billingMonth }
				: {}),
			...(query.examId !== undefined ? { examId: query.examId } : {}),
			...statusWhere,
		},
		include: studentFeeInclude,
		orderBy: { dueDate: "desc" },
	});

	const now = new Date();
	const enriched = rows.map((row) => enrichFeeRecord(row, now));

	if (query.status === FeeStatus.OVERDUE) {
		return enriched.filter((f) => f.isOverdue);
	}
	if (
		query.status === FeeStatus.PENDING ||
		query.status === FeeStatus.PARTIAL
	) {
		return enriched.filter((f) => f.status === query.status);
	}
	return enriched;
};

export const getStudentFeeById = async (schoolId: number, id: number) => {
	const fee = await prisma.studentFee.findFirst({
		where: { id, schoolId },
		include: studentFeeInclude,
	});
	if (!fee) throw new AppError(404, "Student fee not found");
	return enrichFeeRecord(fee);
};

export const bulkCreateStudentFees = async (
	schoolId: number,
	payload: BulkCreateStudentFeeInput,
) => {
	const schoolClass = await prisma.schoolClass.findFirst({
		where: { id: payload.classId, schoolId },
		select: { id: true, name: true },
	});
	if (!schoolClass) {
		throw new AppError(404, "Class not found in this school");
	}

	let resolvedAmount = payload.amount;
	if (resolvedAmount === undefined || payload.useClassDefaultAmount) {
		const classFee = await resolveClassFeeAmount(
			schoolId,
			payload.classId,
			payload.feeType,
			payload.academicYear,
		);
		if (classFee.amount !== null && classFee.amount > 0) {
			if (payload.amount === undefined) {
				resolvedAmount = classFee.amount;
			}
		}
	}

	if (resolvedAmount === undefined || resolvedAmount <= 0) {
		throw new AppError(
			400,
			`No default ${payload.feeType} fee is configured for ${schoolClass.name}. Please enter an amount.`,
		);
	}

	if (payload.examId !== undefined) {
		const exam = await prisma.exam.findFirst({
			where: { id: payload.examId, schoolId },
			select: { id: true },
		});
		if (!exam) {
			throw new AppError(404, "Selected exam was not found in this school");
		}
	}

	const enrollments = await prisma.enrollment.findMany({
		where: {
			schoolId,
			classId: payload.classId,
			status: "ACTIVE",
			...(payload.sectionId !== undefined
				? { sectionId: payload.sectionId }
				: {}),
			...(payload.academicYear !== undefined
				? { academicYear: payload.academicYear }
				: {}),
		},
		select: {
			id: true,
			studentId: true,
			academicYear: true,
			student: {
				select: {
					concessionType: true,
					concessionMode: true,
					concessionValue: true,
					concessionReason: true,
				},
			},
		},
	});

	if (enrollments.length === 0) {
		throw new AppError(
			404,
			"No active student enrollments found for the selected class/section",
		);
	}

	const normalizedTitle = payload.title.trim().toLowerCase();
	const existingFees = await prisma.studentFee.findMany({
		where: {
			schoolId,
			enrollmentId: { in: enrollments.map((e) => e.id) },
			feeType: payload.feeType,
		},
		select: {
			enrollmentId: true,
			title: true,
			billingMonth: true,
			examId: true,
		},
	});

	const existingEnrollmentIds = new Set(
		existingFees
			.filter((f) => {
				if (payload.billingMonth && f.billingMonth === payload.billingMonth) {
					return true;
				}
				if (payload.examId && f.examId === payload.examId) {
					return true;
				}
				return f.title.trim().toLowerCase() === normalizedTitle;
			})
			.map((f) => f.enrollmentId),
	);

	const toCreate = enrollments.filter((e) => !existingEnrollmentIds.has(e.id));
	const skippedCount = enrollments.length - toCreate.length;
	const shouldApplyConcession = payload.applyStudentConcession !== false;
	let concessionAppliedCount = 0;

	if (toCreate.length > 0) {
		await prisma.studentFee.createMany({
			data: toCreate.map((e) => {
				const concession = shouldApplyConcession
					? computeConcessionDiscount(resolvedAmount, e.student)
					: {
							grossAmount: roundMoney(resolvedAmount),
							concessionAmount: 0,
							netAmount: roundMoney(resolvedAmount),
							concessionType: null,
							concessionReason: null,
						};
				if (concession.concessionAmount > 0) {
					concessionAppliedCount += 1;
				}
				const autoWaived =
					concession.concessionAmount > 0 && concession.netAmount === 0;
				return {
					schoolId,
					studentId: e.studentId,
					enrollmentId: e.id,
					feeType: payload.feeType,
					title: payload.title.trim(),
					amount: new Prisma.Decimal(concession.netAmount.toFixed(2)),
					grossAmount: new Prisma.Decimal(concession.grossAmount.toFixed(2)),
					concessionAmount: new Prisma.Decimal(
						concession.concessionAmount.toFixed(2),
					),
					...(concession.concessionType
						? { concessionType: concession.concessionType }
						: {}),
					status: autoWaived ? FeeStatus.WAIVED : FeeStatus.PENDING,
					...(autoWaived && concession.concessionReason
						? { waiverReason: concession.concessionReason }
						: {}),
					dueDate: payload.dueDate,
					academicYear: payload.academicYear?.trim() || e.academicYear,
					...(payload.billingMonth !== undefined
						? { billingMonth: payload.billingMonth }
						: {}),
					...(payload.examId !== undefined ? { examId: payload.examId } : {}),
					...(payload.description !== undefined
						? { description: payload.description.trim() }
						: {}),
				};
			}),
		});
	}

	return {
		className: schoolClass.name,
		resolvedAmount,
		createdCount: toCreate.length,
		skippedCount,
		concessionAppliedCount,
		createdStudentIds: toCreate.map((e) => e.studentId),
	};
};

export const updateStudentFee = async (
	schoolId: number,
	id: number,
	payload: UpdateStudentFeeInput,
	requester?: { userId: number; role: UserRole },
) => {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.studentFee.findFirst({
			where: { id, schoolId },
		});
		if (!existing) throw new AppError(404, "Student fee not found");

		const isWaiverMutation =
			payload.waivedAmount !== undefined ||
			payload.waiverReason !== undefined ||
			payload.status === FeeStatus.WAIVED;

		if (isWaiverMutation && requester && requester.role !== UserRole.ADMIN) {
			throw new AppError(
				403,
				"Only School Admins can approve full or partial fee waivers",
			);
		}

		if (payload.examId !== undefined && payload.examId !== null) {
			const exam = await tx.exam.findFirst({
				where: { id: payload.examId, schoolId },
				select: { id: true },
			});
			if (!exam) {
				throw new AppError(404, "Selected exam was not found in this school");
			}
		}

		const verifiedSum = await tx.studentPayment.aggregate({
			where: { feeId: id, status: PaymentStatus.VERIFIED },
			_sum: { paidAmount: true },
		});
		const totalVerifiedPaid = roundMoney(
			Number(verifiedSum._sum.paidAmount ?? 0),
		);

		const nextAmount = roundMoney(
			payload.amount !== undefined ? payload.amount : Number(existing.amount),
		);
		const maxWaivable = roundMoney(Math.max(0, nextAmount - totalVerifiedPaid));

		let nextWaivedAmount = roundMoney(Number(existing.waivedAmount ?? 0));
		if (payload.waivedAmount !== undefined) {
			if (payload.waivedAmount > maxWaivable + 0.001) {
				throw new AppError(
					400,
					`Waived amount (৳${payload.waivedAmount}) cannot exceed the unpaid balance (৳${maxWaivable})`,
				);
			}
			nextWaivedAmount = roundMoney(payload.waivedAmount);
		} else if (payload.status === FeeStatus.WAIVED) {
			// Full waiver of remaining balance without erasing already verified payments
			nextWaivedAmount = maxWaivable;
		} else if (nextWaivedAmount > maxWaivable) {
			nextWaivedAmount = maxWaivable;
		}

		const resolvedDescription =
			payload.description !== undefined
				? payload.description
				: payload.remarks !== undefined
					? payload.remarks
					: undefined;

		let resolvedStatus = payload.status;
		const remainingAfterWaiver = roundMoney(
			Math.max(0, nextAmount - totalVerifiedPaid - nextWaivedAmount),
		);

		if (
			payload.waivedAmount !== undefined ||
			(payload.amount !== undefined &&
				payload.status === undefined &&
				existing.status !== FeeStatus.WAIVED)
		) {
			if (remainingAfterWaiver === 0) {
				resolvedStatus =
					totalVerifiedPaid > 0 ? FeeStatus.PAID : FeeStatus.WAIVED;
			} else if (totalVerifiedPaid > 0) {
				resolvedStatus = FeeStatus.PARTIAL;
			} else {
				resolvedStatus = FeeStatus.PENDING;
			}
		} else if (payload.status === FeeStatus.WAIVED && totalVerifiedPaid > 0) {
			// Remaining balance is waived, preserve already verified payments cleanly
			resolvedStatus = FeeStatus.WAIVED;
		}

		const previous = {
			title: existing.title,
			amount: roundMoney(Number(existing.amount)),
			waivedAmount: roundMoney(Number(existing.waivedAmount ?? 0)),
			status: existing.status,
		};

		const updated = await tx.studentFee.update({
			where: { id },
			data: {
				...(payload.feeType !== undefined ? { feeType: payload.feeType } : {}),
				...(payload.title !== undefined ? { title: payload.title } : {}),
				...(payload.amount !== undefined
					? { amount: new Prisma.Decimal(nextAmount.toFixed(2)) }
					: {}),
				...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
				...(payload.academicYear !== undefined
					? { academicYear: payload.academicYear }
					: {}),
				...(payload.billingMonth !== undefined
					? { billingMonth: payload.billingMonth }
					: {}),
				...(payload.examId !== undefined ? { examId: payload.examId } : {}),
				...(resolvedStatus !== undefined ? { status: resolvedStatus } : {}),
				...(isWaiverMutation || nextWaivedAmount !== previous.waivedAmount
					? {
							waivedAmount: new Prisma.Decimal(nextWaivedAmount.toFixed(2)),
							...(payload.waiverReason !== undefined
								? { waiverReason: payload.waiverReason }
								: {}),
							...(nextWaivedAmount > 0 && requester
								? { waivedById: requester.userId, waivedAt: new Date() }
								: nextWaivedAmount === 0
									? { waivedById: null, waivedAt: null }
									: {}),
						}
					: {}),
				...(resolvedDescription !== undefined
					? { description: resolvedDescription }
					: {}),
			},
			include: studentFeeInclude,
		});

		return { fee: enrichFeeRecord(updated), previous };
	});
};

export const deleteStudentFee = async (schoolId: number, id: number) => {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.studentFee.findFirst({
			where: { id, schoolId },
		});
		if (!existing) throw new AppError(404, "Student fee not found");

		const activePaymentsCount = await tx.studentPayment.count({
			where: {
				feeId: id,
				status: { in: [PaymentStatus.PENDING, PaymentStatus.VERIFIED] },
			},
		});

		if (activePaymentsCount > 0) {
			throw new AppError(
				400,
				"Cannot delete fee with pending or verified payment records",
			);
		}

		// Clean up any REJECTED payment attempts before deleting the invoice
		await tx.studentPayment.deleteMany({
			where: { feeId: id, status: PaymentStatus.REJECTED },
		});

		return tx.studentFee.delete({ where: { id } });
	});
};
