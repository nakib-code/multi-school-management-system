import { FeeStatus, PaymentStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { resolveClassFeeAmount } from "../class/service.js";
import type {
	BulkCreateStudentFeeInput,
	CreateStudentFeeInput,
	StudentFeeFilterQuery,
	UpdateStudentFeeInput,
} from "./interface.js";

const studentFeeInclude = {
	student: {
		select: { id: true, studentId: true, firstName: true, lastName: true },
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
	payments: {
		select: {
			id: true,
			trxId: true,
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

	return prisma.studentFee.create({
		data: {
			schoolId,
			studentId: payload.studentId,
			enrollmentId: payload.enrollmentId,
			feeType: payload.feeType,
			title: payload.title.trim(),
			amount: resolvedAmount,
			dueDate: payload.dueDate,
			academicYear,
			...(payload.billingMonth !== undefined
				? { billingMonth: payload.billingMonth }
				: {}),
			...(payload.examId !== undefined ? { examId: payload.examId } : {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
			...(payload.description !== undefined
				? { description: payload.description.trim() }
				: {}),
		},
		include: studentFeeInclude,
	});
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

	return prisma.studentFee.findMany({
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
			...(query.status !== undefined ? { status: query.status } : {}),
		},
		include: studentFeeInclude,
		orderBy: { dueDate: "desc" },
	});
};

export const getStudentFeeById = async (schoolId: number, id: number) => {
	const fee = await prisma.studentFee.findFirst({
		where: { id, schoolId },
		include: studentFeeInclude,
	});
	if (!fee) throw new AppError(404, "Student fee not found");
	return fee;
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

	if (toCreate.length > 0) {
		await prisma.studentFee.createMany({
			data: toCreate.map((e) => ({
				schoolId,
				studentId: e.studentId,
				enrollmentId: e.id,
				feeType: payload.feeType,
				title: payload.title.trim(),
				amount: resolvedAmount,
				dueDate: payload.dueDate,
				academicYear: payload.academicYear?.trim() || e.academicYear,
				...(payload.billingMonth !== undefined
					? { billingMonth: payload.billingMonth }
					: {}),
				...(payload.examId !== undefined ? { examId: payload.examId } : {}),
				...(payload.description !== undefined
					? { description: payload.description.trim() }
					: {}),
			})),
		});
	}

	return {
		className: schoolClass.name,
		resolvedAmount,
		createdCount: toCreate.length,
		skippedCount,
		createdStudentIds: toCreate.map((e) => e.studentId),
	};
};

export const updateStudentFee = async (
	schoolId: number,
	id: number,
	payload: UpdateStudentFeeInput,
) => {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.studentFee.findFirst({
			where: { id, schoolId },
		});
		if (!existing) throw new AppError(404, "Student fee not found");

		const resolvedDescription =
			payload.description !== undefined
				? payload.description
				: payload.remarks !== undefined
					? payload.remarks
					: undefined;

		let resolvedStatus = payload.status;
		if (
			payload.amount !== undefined &&
			payload.status === undefined &&
			existing.status !== FeeStatus.WAIVED
		) {
			const verifiedSum = await tx.studentPayment.aggregate({
				where: { feeId: id, status: PaymentStatus.VERIFIED },
				_sum: { paidAmount: true },
			});
			const totalVerifiedPaid = Number(verifiedSum._sum.paidAmount ?? 0);
			resolvedStatus =
				totalVerifiedPaid >= payload.amount
					? FeeStatus.PAID
					: totalVerifiedPaid > 0
						? FeeStatus.PARTIAL
						: FeeStatus.PENDING;
		}

		return tx.studentFee.update({
			where: { id },
			data: {
				...(payload.feeType !== undefined ? { feeType: payload.feeType } : {}),
				...(payload.title !== undefined ? { title: payload.title } : {}),
				...(payload.amount !== undefined ? { amount: payload.amount } : {}),
				...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
				...(payload.academicYear !== undefined
					? { academicYear: payload.academicYear }
					: {}),
				...(payload.billingMonth !== undefined
					? { billingMonth: payload.billingMonth }
					: {}),
				...(payload.examId !== undefined ? { examId: payload.examId } : {}),
				...(resolvedStatus !== undefined ? { status: resolvedStatus } : {}),
				...(resolvedDescription !== undefined
					? { description: resolvedDescription }
					: {}),
			},
			include: studentFeeInclude,
		});
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
