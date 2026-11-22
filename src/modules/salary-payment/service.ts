import crypto from "node:crypto";
import {
	SalaryPaymentStatus,
	SalaryStatus,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreateSalaryPaymentInput,
	SalaryPaymentFilterQuery,
	UpdateSalaryPaymentInput,
} from "./interface.js";

const salaryPaymentInclude = {
	teacher: {
		select: { id: true, employeeId: true, firstName: true, lastName: true },
	},
	salary: {
		select: {
			id: true,
			month: true,
			year: true,
			netSalary: true,
			status: true,
		},
	},
	paidByUser: {
		select: { id: true, name: true, role: true },
	},
};

export const createSalaryPayment = async (
	schoolId: number,
	paidBy: number,
	payload: CreateSalaryPaymentInput,
) => {
	const salary = await prisma.teacherSalary.findFirst({
		where: {
			id: payload.salaryId,
			schoolId,
			teacherId: payload.teacherId,
		},
	});
	if (!salary) {
		throw new AppError(404, "Teacher salary record not found for this teacher");
	}

	const transactionId =
		payload.transactionId ??
		`SALPAY-${schoolId}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

	const duplicateTxn = await prisma.salaryPayment.findUnique({
		where: { transactionId },
	});
	if (duplicateTxn) {
		throw new AppError(409, "Transaction ID already exists");
	}

	return prisma.$transaction(async (tx) => {
		const payment = await tx.salaryPayment.create({
			data: {
				schoolId,
				teacherId: payload.teacherId,
				salaryId: payload.salaryId,
				transactionId,
				amount: payload.amount,
				paymentMethod: payload.paymentMethod,
				status: payload.status ?? SalaryPaymentStatus.COMPLETED,
				paidBy,
				...(payload.paidAt !== undefined ? { paidAt: payload.paidAt } : {}),
				...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
			},
			include: salaryPaymentInclude,
		});

		const completedSum = await tx.salaryPayment.aggregate({
			where: {
				salaryId: payload.salaryId,
				status: SalaryPaymentStatus.COMPLETED,
			},
			_sum: { amount: true },
		});

		const totalPaid = Number(completedSum._sum.amount ?? 0);
		const netSalary = Number(salary.netSalary);

		const nextSalaryStatus =
			totalPaid >= netSalary
				? SalaryStatus.PAID
				: totalPaid > 0
					? SalaryStatus.PARTIAL
					: SalaryStatus.PENDING;

		await tx.teacherSalary.update({
			where: { id: salary.id },
			data: { status: nextSalaryStatus },
		});

		return payment;
	});
};

export const getSalaryPayments = async (
	schoolId: number,
	query: SalaryPaymentFilterQuery,
) => {
	return prisma.salaryPayment.findMany({
		where: {
			schoolId,
			...(query.teacherId !== undefined ? { teacherId: query.teacherId } : {}),
			...(query.salaryId !== undefined ? { salaryId: query.salaryId } : {}),
			...(query.paymentMethod !== undefined
				? { paymentMethod: query.paymentMethod }
				: {}),
			...(query.status !== undefined ? { status: query.status } : {}),
		},
		include: salaryPaymentInclude,
		orderBy: { paidAt: "desc" },
	});
};

export const getSalaryPaymentById = async (schoolId: number, id: number) => {
	const payment = await prisma.salaryPayment.findFirst({
		where: { id, schoolId },
		include: salaryPaymentInclude,
	});
	if (!payment) throw new AppError(404, "Salary payment not found");
	return payment;
};

export const updateSalaryPayment = async (
	schoolId: number,
	id: number,
	payload: UpdateSalaryPaymentInput,
) => {
	const existing = await prisma.salaryPayment.findFirst({
		where: { id, schoolId },
		include: { salary: true },
	});
	if (!existing) throw new AppError(404, "Salary payment not found");

	return prisma.$transaction(async (tx) => {
		const updated = await tx.salaryPayment.update({
			where: { id },
			data: {
				...(payload.status !== undefined ? { status: payload.status } : {}),
				...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
			},
			include: salaryPaymentInclude,
		});

		if (payload.status !== undefined) {
			const completedSum = await tx.salaryPayment.aggregate({
				where: {
					salaryId: existing.salaryId,
					status: SalaryPaymentStatus.COMPLETED,
				},
				_sum: { amount: true },
			});
			const totalPaid = Number(completedSum._sum.amount ?? 0);
			const netSalary = Number(existing.salary.netSalary);

			const nextSalaryStatus =
				totalPaid >= netSalary
					? SalaryStatus.PAID
					: totalPaid > 0
						? SalaryStatus.PARTIAL
						: SalaryStatus.PENDING;

			await tx.teacherSalary.update({
				where: { id: existing.salaryId },
				data: { status: nextSalaryStatus },
			});
		}

		return updated;
	});
};
