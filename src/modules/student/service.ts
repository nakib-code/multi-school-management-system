import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

export const getMyStudentProfile = async (userId: number, schoolId: number) => {
	const student = await prisma.student.findFirst({
		where: {
			userId,
			schoolId,
			isActive: true,
		},
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			dateOfBirth: true,
			gender: true,
			phone: true,
			address: true,
			admissionDate: true,
			isActive: true,

			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					role: true,
					status: true,
					schoolId: true,
				},
			},
		},
	});

	if (!student) {
		throw new AppError(404, "Student profile not found");
	}

	return student;
};

export const getAllStudents = async (
	schoolId: number,
	page: number,
	limit: number,
	search?: string,
) => {
	const skip = (page - 1) * limit;

	const where = {
		schoolId,
		isActive: true,
		...(search
			? {
					OR: [
						{
							firstName: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
						{
							lastName: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
						{
							studentId: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
						{
							user: {
								email: {
									contains: search,
									mode: "insensitive" as const,
								},
							},
						},
					],
				}
			: {}),
	};

	const [students, total] = await Promise.all([
		prisma.student.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				createdAt: "desc",
			},
			select: {
				id: true,
				studentId: true,
				firstName: true,
				lastName: true,
				dateOfBirth: true,
				gender: true,
				phone: true,
				address: true,
				admissionDate: true,
				isActive: true,
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
						role: true,
						status: true,
					},
				},
			},
		}),
		prisma.student.count({ where }),
	]);

	return {
		students,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

export const getStudentById = async (schoolId: number, studentId: number) => {
	const student = await prisma.student.findFirst({
		where: {
			id: studentId,
			schoolId,
		},
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			dateOfBirth: true,
			gender: true,
			phone: true,
			address: true,
			admissionDate: true,
			isActive: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					role: true,
					status: true,
				},
			},
		},
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	return student;
};

export const updateStudent = async (
	schoolId: number,
	studentId: number,
	data: {
		firstName?: string;
		lastName?: string;
		dateOfBirth?: Date;
		gender?: string;
		phone?: string;
		address?: string;
	},
) => {
	const student = await prisma.student.findFirst({
		where: {
			id: studentId,
			schoolId,
		},
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	const updatedStudent = await prisma.student.update({
		where: {
			id: student.id,
		},
		data,
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			dateOfBirth: true,
			gender: true,
			phone: true,
			address: true,
			admissionDate: true,
			isActive: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					role: true,
					status: true,
				},
			},
		},
	});

	return updatedStudent;
};

export const deactivateStudent = async (
	schoolId: number,
	studentId: number,
) => {
	const student = await prisma.student.findFirst({
		where: {
			id: studentId,
			schoolId,
		},
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	if (!student.isActive) {
		throw new AppError(400, "Student is already inactive");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedStudent = await tx.student.update({
			where: {
				id: student.id,
			},
			data: {
				isActive: false,
			},
		});

		await tx.user.update({
			where: {
				id: student.userId,
			},
			data: {
				status: "INACTIVE",
			},
		});

		return updatedStudent;
	});

	return result;
};

export const activateStudent = async (schoolId: number, studentId: number) => {
	const student = await prisma.student.findFirst({
		where: {
			id: studentId,
			schoolId,
		},
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	if (student.isActive) {
		throw new AppError(400, "Student is already active");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedStudent = await tx.student.update({
			where: {
				id: student.id,
			},
			data: {
				isActive: true,
			},
		});

		await tx.user.update({
			where: {
				id: student.userId,
			},
			data: {
				status: "ACTIVE",
			},
		});

		return updatedStudent;
	});

	return result;
};
