import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreateStudentFeeInput,
	StudentFeeFilterQuery,
	UpdateStudentFeeInput,
} from "./interface.js";

const studentFeeInclude = {
	student: {
		select: { id: true, studentId: true, firstName: true, lastName: true },
	},
	enrollment: {
		select: { id: true, academicYear: true, rollNumber: true },
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

	return prisma.studentFee.create({
		data: {
			schoolId,
			studentId: payload.studentId,
			enrollmentId: payload.enrollmentId,
			feeType: payload.feeType,
			title: payload.title,
			amount: payload.amount,
			dueDate: payload.dueDate,
			...(payload.status !== undefined ? { status: payload.status } : {}),
			...(payload.description !== undefined
				? { description: payload.description }
				: {}),
		},
		include: studentFeeInclude,
	});
};

export const getStudentFees = async (
	schoolId: number,
	query: StudentFeeFilterQuery,
) => {
	return prisma.studentFee.findMany({
		where: {
			schoolId,
			...(query.studentId !== undefined ? { studentId: query.studentId } : {}),
			...(query.enrollmentId !== undefined
				? { enrollmentId: query.enrollmentId }
				: {}),
			...(query.feeType !== undefined ? { feeType: query.feeType } : {}),
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

export const updateStudentFee = async (
	schoolId: number,
	id: number,
	payload: UpdateStudentFeeInput,
) => {
	const existing = await prisma.studentFee.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Student fee not found");

	return prisma.studentFee.update({
		where: { id },
		data: {
			...(payload.feeType !== undefined ? { feeType: payload.feeType } : {}),
			...(payload.title !== undefined ? { title: payload.title } : {}),
			...(payload.amount !== undefined ? { amount: payload.amount } : {}),
			...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
			...(payload.description !== undefined
				? { description: payload.description }
				: {}),
		},
		include: studentFeeInclude,
	});
};

export const deleteStudentFee = async (schoolId: number, id: number) => {
	const existing = await prisma.studentFee.findFirst({
		where: { id, schoolId },
		include: { _count: { select: { payments: true } } },
	});
	if (!existing) throw new AppError(404, "Student fee not found");
	if (existing._count.payments > 0) {
		throw new AppError(400, "Cannot delete fee with existing payment records");
	}
	return prisma.studentFee.delete({ where: { id } });
};
