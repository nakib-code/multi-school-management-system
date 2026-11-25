import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";

export interface CreateStudentInput {
	firstName: string;
	lastName?: string | undefined;
	dateOfBirth?: Date | undefined;
	gender?: string | undefined;
	phone?: string | undefined;
	address?: string | undefined;
	studentId?: string | undefined;
	guardianName?: string | undefined;
	guardianPhone?: string | undefined;
	guardianEmail?: string | undefined;
	guardianRelation?: string | undefined;
	guardianOccupation?: string | undefined;
	guardianAddress?: string | undefined;
	guardianPassword?: string | undefined;
}

const generateStudentCode = (schoolId: number) => {
	const rand = Math.floor(1000 + Math.random() * 9000);
	const ts = Date.now().toString().slice(-5);
	return `STD-${schoolId}-${ts}${rand}`;
};

export const createStudent = async (
	schoolId: number,
	input: CreateStudentInput,
) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
		select: { id: true, status: true },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const generatedCode = input.studentId?.trim() || generateStudentCode(schoolId);

	return prisma.$transaction(async (tx) => {
		// 1. Create Student WITHOUT requiring email or User login account
		const student = await tx.student.create({
			data: {
				schoolId,
				studentId: generatedCode,
				firstName: input.firstName.trim(),
				...(input.lastName !== undefined && {
					lastName: input.lastName.trim(),
				}),
				...(input.dateOfBirth !== undefined && {
					dateOfBirth: input.dateOfBirth,
				}),
				...(input.gender !== undefined && { gender: input.gender.trim() }),
				...(input.phone !== undefined && { phone: input.phone.trim() }),
				...(input.address !== undefined && { address: input.address.trim() }),
				isActive: true,
			},
		});

		let guardianSummary: {
			guardianId: number;
			name: string;
			phone: string;
			email: string;
			isExistingGuardian: boolean;
			defaultPassword?: string;
		} | null = null;

		// 2. Combined Guardian Onboarding by (schoolId, phone)
		if (input.guardianPhone?.trim()) {
			const cleanPhone = input.guardianPhone.trim();

			const existingGuardian = await tx.guardian.findFirst({
				where: {
					schoolId,
					user: {
						phone: cleanPhone,
					},
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
						},
					},
				},
			});

			if (existingGuardian) {
				await tx.guardianStudent.upsert({
					where: {
						guardianId_studentId: {
							guardianId: existingGuardian.id,
							studentId: student.id,
						},
					},
					update: {},
					create: {
						guardianId: existingGuardian.id,
						studentId: student.id,
						isPrimary: true,
					},
				});

				guardianSummary = {
					guardianId: existingGuardian.id,
					name: existingGuardian.user.name,
					phone: existingGuardian.user.phone ?? cleanPhone,
					email: existingGuardian.user.email,
					isExistingGuardian: true,
				};
			} else {
				const digits = cleanPhone.replace(/\D/g, "");
				const defaultPassword =
					input.guardianPassword?.trim() ||
					`Madrasa@${digits.slice(-4) || "1234"}`;
				const passwordHash = await hashPassword(defaultPassword);
				const guardianEmail =
					input.guardianEmail?.trim().toLowerCase() ||
					`guardian.${schoolId}.${digits || Date.now()}@madrasaos.local`;
				const guardianName =
					input.guardianName?.trim() || `Guardian of ${input.firstName.trim()}`;

				const guardianUser = await tx.user.create({
					data: {
						name: guardianName,
						email: guardianEmail,
						phone: cleanPhone,
						passwordHash,
						role: "GUARDIAN",
						status: "ACTIVE",
						schoolId,
						mustChangePassword: true,
					},
				});

				const guardian = await tx.guardian.create({
					data: {
						userId: guardianUser.id,
						schoolId,
						relation: input.guardianRelation?.trim() || "Father",
						...(input.guardianOccupation !== undefined && {
							occupation: input.guardianOccupation.trim(),
						}),
						...(input.guardianAddress !== undefined && {
							address: input.guardianAddress.trim(),
						}),
					},
				});

				await tx.guardianStudent.create({
					data: {
						guardianId: guardian.id,
						studentId: student.id,
						isPrimary: true,
					},
				});

				guardianSummary = {
					guardianId: guardian.id,
					name: guardianUser.name,
					phone: cleanPhone,
					email: guardianUser.email,
					isExistingGuardian: false,
					defaultPassword,
				};
			}
		}

		return {
			student,
			guardian: guardianSummary,
		};
	});
};

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
							phone: {
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
				guardians: {
					select: {
						isPrimary: true,
						guardian: {
							select: {
								id: true,
								relation: true,
								user: {
									select: {
										name: true,
										phone: true,
										email: true,
									},
								},
							},
						},
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
			guardians: {
				select: {
					isPrimary: true,
					guardian: {
						select: {
							id: true,
							relation: true,
							occupation: true,
							user: {
								select: {
									name: true,
									phone: true,
									email: true,
								},
							},
						},
					},
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

		if (student.userId !== null) {
			await tx.user.update({
				where: {
					id: student.userId,
				},
				data: {
					status: "INACTIVE",
				},
			});
		}

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

		if (student.userId !== null) {
			await tx.user.update({
				where: {
					id: student.userId,
				},
				data: {
					status: "ACTIVE",
				},
			});
		}

		return updatedStudent;
	});

	return result;
};
