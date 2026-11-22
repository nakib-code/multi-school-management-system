import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreateTeacherSalaryInput,
	TeacherSalaryFilterQuery,
	UpdateTeacherSalaryInput,
} from "./interface.js";

const teacherSalaryInclude = {
	teacher: {
		select: {
			id: true,
			employeeId: true,
			firstName: true,
			lastName: true,
			designation: true,
		},
	},
	payments: {
		select: {
			id: true,
			transactionId: true,
			amount: true,
			paymentMethod: true,
			status: true,
			paidAt: true,
		},
	},
};

export const createTeacherSalary = async (
	schoolId: number,
	payload: CreateTeacherSalaryInput,
) => {
	const teacher = await prisma.teacher.findFirst({
		where: { id: payload.teacherId, schoolId },
	});
	if (!teacher) throw new AppError(404, "Teacher not found in this school");

	const duplicate = await prisma.teacherSalary.findFirst({
		where: {
			teacherId: payload.teacherId,
			month: payload.month,
			year: payload.year,
		},
	});
	if (duplicate) {
		throw new AppError(
			409,
			"Salary record already exists for this teacher for the specified month and year",
		);
	}

	const bonus = payload.bonus ?? 0;
	const deduction = payload.deduction ?? 0;
	const netSalary = payload.basicSalary + bonus - deduction;
	if (netSalary < 0) {
		throw new AppError(400, "Net salary cannot be negative");
	}

	return prisma.teacherSalary.create({
		data: {
			schoolId,
			teacherId: payload.teacherId,
			month: payload.month,
			year: payload.year,
			basicSalary: payload.basicSalary,
			bonus,
			deduction,
			netSalary,
			...(payload.status !== undefined ? { status: payload.status } : {}),
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		include: teacherSalaryInclude,
	});
};

export const getTeacherSalaries = async (
	schoolId: number,
	query: TeacherSalaryFilterQuery,
) => {
	return prisma.teacherSalary.findMany({
		where: {
			schoolId,
			...(query.teacherId !== undefined ? { teacherId: query.teacherId } : {}),
			...(query.month !== undefined ? { month: query.month } : {}),
			...(query.year !== undefined ? { year: query.year } : {}),
			...(query.status !== undefined ? { status: query.status } : {}),
		},
		include: teacherSalaryInclude,
		orderBy: [{ year: "desc" }, { month: "desc" }],
	});
};

export const getTeacherSalaryById = async (schoolId: number, id: number) => {
	const salary = await prisma.teacherSalary.findFirst({
		where: { id, schoolId },
		include: teacherSalaryInclude,
	});
	if (!salary) throw new AppError(404, "Teacher salary not found");
	return salary;
};

export const updateTeacherSalary = async (
	schoolId: number,
	id: number,
	payload: UpdateTeacherSalaryInput,
) => {
	const existing = await prisma.teacherSalary.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Teacher salary not found");

	const nextBasic = payload.basicSalary ?? Number(existing.basicSalary);
	const nextBonus = payload.bonus ?? Number(existing.bonus);
	const nextDeduction = payload.deduction ?? Number(existing.deduction);
	const nextNet = nextBasic + nextBonus - nextDeduction;

	if (nextNet < 0) {
		throw new AppError(400, "Net salary cannot be negative");
	}

	return prisma.teacherSalary.update({
		where: { id },
		data: {
			basicSalary: nextBasic,
			bonus: nextBonus,
			deduction: nextDeduction,
			netSalary: nextNet,
			...(payload.status !== undefined ? { status: payload.status } : {}),
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
		},
		include: teacherSalaryInclude,
	});
};

export const deleteTeacherSalary = async (schoolId: number, id: number) => {
	const existing = await prisma.teacherSalary.findFirst({
		where: { id, schoolId },
		include: { _count: { select: { payments: true } } },
	});
	if (!existing) throw new AppError(404, "Teacher salary not found");
	if (existing._count.payments > 0) {
		throw new AppError(
			400,
			"Cannot delete salary record with existing salary payments",
		);
	}
	return prisma.teacherSalary.delete({ where: { id } });
};
