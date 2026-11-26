import { UserRole, UserStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";
import type {
	CreateGuardianInput,
	LinkGuardianStudentInput,
	UpdateGuardianInput,
} from "./interface.js";

const guardianInclude = {
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
	students: {
		include: {
			student: {
				select: {
					id: true,
					studentId: true,
					firstName: true,
					lastName: true,
					isActive: true,
				},
			},
		},
	},
};

export const createGuardian = async (
	schoolId: number,
	payload: CreateGuardianInput,
) => {
	const cleanPhone = payload.phone.trim();
	const digits = cleanPhone.replace(/\D/g, "");

	const existingByPhone = await prisma.guardian.findFirst({
		where: {
			schoolId,
			user: { phone: cleanPhone },
		},
		select: { id: true },
	});
	if (existingByPhone) {
		throw new AppError(
			409,
			"A guardian with this phone number already exists in this school",
		);
	}

	const normalizedEmail =
		payload.email?.trim().toLowerCase() ||
		`guardian.${schoolId}.${digits || Date.now()}@madrasaos.local`;

	const existingUser = await prisma.user.findUnique({
		where: { email: normalizedEmail },
	});
	if (existingUser) {
		throw new AppError(409, "A user with this email already exists");
	}

	if (payload.studentIds && payload.studentIds.length > 0) {
		const students = await prisma.student.findMany({
			where: { id: { in: payload.studentIds }, schoolId },
			select: { id: true },
		});
		if (students.length !== payload.studentIds.length) {
			throw new AppError(
				404,
				"One or more specified students were not found in this school",
			);
		}
	}

	const rawPassword =
		payload.password?.trim() || `Madrasa@${digits.slice(-4) || "1234"}`;
	const passwordHash = await hashPassword(rawPassword);

	return prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				name: payload.name.trim(),
				email: normalizedEmail,
				passwordHash,
				role: UserRole.GUARDIAN,
				status: UserStatus.ACTIVE,
				schoolId,
				phone: cleanPhone,
				mustChangePassword: !payload.password,
			},
		});

		const guardian = await tx.guardian.create({
			data: {
				userId: user.id,
				schoolId,
				relation: payload.relation?.trim() || "Father",
				...(payload.occupation !== undefined
					? { occupation: payload.occupation.trim() }
					: {}),
				...(payload.address !== undefined
					? { address: payload.address.trim() }
					: {}),
				...(payload.nid !== undefined ? { nid: payload.nid.trim() } : {}),
				...(payload.studentIds && payload.studentIds.length > 0
					? {
							students: {
								create: payload.studentIds.map((studentId, index) => ({
									studentId,
									isPrimary: index === 0,
								})),
							},
						}
					: {}),
			},
			include: guardianInclude,
		});

		return guardian;
	});
};

export const getGuardians = async (schoolId: number) => {
	return prisma.guardian.findMany({
		where: { schoolId },
		include: guardianInclude,
		orderBy: { createdAt: "desc" },
	});
};

export const getGuardianById = async (schoolId: number, id: number) => {
	const guardian = await prisma.guardian.findFirst({
		where: { id, schoolId },
		include: guardianInclude,
	});
	if (!guardian) throw new AppError(404, "Guardian not found");
	return guardian;
};

export const updateGuardian = async (
	schoolId: number,
	id: number,
	payload: UpdateGuardianInput,
) => {
	const existing = await prisma.guardian.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Guardian not found");

	return prisma.$transaction(async (tx) => {
		if (payload.name !== undefined || payload.phone !== undefined) {
			await tx.user.update({
				where: { id: existing.userId },
				data: {
					...(payload.name !== undefined ? { name: payload.name } : {}),
					...(payload.phone !== undefined ? { phone: payload.phone } : {}),
				},
			});
		}

		return tx.guardian.update({
			where: { id },
			data: {
				...(payload.relation !== undefined
					? { relation: payload.relation }
					: {}),
				...(payload.occupation !== undefined
					? { occupation: payload.occupation }
					: {}),
				...(payload.address !== undefined ? { address: payload.address } : {}),
				...(payload.nid !== undefined ? { nid: payload.nid } : {}),
			},
			include: guardianInclude,
		});
	});
};

export const linkStudentToGuardian = async (
	schoolId: number,
	guardianId: number,
	payload: LinkGuardianStudentInput,
) => {
	const [guardian, student] = await Promise.all([
		prisma.guardian.findFirst({ where: { id: guardianId, schoolId } }),
		prisma.student.findFirst({ where: { id: payload.studentId, schoolId } }),
	]);

	if (!guardian) throw new AppError(404, "Guardian not found");
	if (!student) throw new AppError(404, "Student not found in this school");

	return prisma.guardianStudent.upsert({
		where: {
			guardianId_studentId: {
				guardianId,
				studentId: payload.studentId,
			},
		},
		create: {
			guardianId,
			studentId: payload.studentId,
			isPrimary: payload.isPrimary ?? false,
		},
		update: {
			...(payload.isPrimary !== undefined
				? { isPrimary: payload.isPrimary }
				: {}),
		},
		include: {
			student: {
				select: { id: true, studentId: true, firstName: true, lastName: true },
			},
		},
	});
};

export const unlinkStudentFromGuardian = async (
	schoolId: number,
	guardianId: number,
	studentId: number,
) => {
	const guardian = await prisma.guardian.findFirst({
		where: { id: guardianId, schoolId },
	});
	if (!guardian) throw new AppError(404, "Guardian not found");

	const link = await prisma.guardianStudent.findUnique({
		where: { guardianId_studentId: { guardianId, studentId } },
	});
	if (!link) throw new AppError(404, "Guardian-student link not found");

	return prisma.guardianStudent.delete({
		where: { guardianId_studentId: { guardianId, studentId } },
	});
};

export const deleteGuardian = async (schoolId: number, id: number) => {
	const existing = await prisma.guardian.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Guardian not found");

	return prisma.$transaction(async (tx) => {
		const deleted = await tx.guardian.delete({ where: { id } });
		await tx.user.update({
			where: { id: existing.userId },
			data: { status: UserStatus.INACTIVE },
		});
		return deleted;
	});
};
