import { UserRole, UserStatus } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";
import type { CreateManagerInput, UpdateManagerInput } from "./interface.js";

const managerInclude = {
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
};

export const createManager = async (
	schoolId: number,
	payload: CreateManagerInput,
) => {
	const [existingUser, existingEmployee] = await Promise.all([
		prisma.user.findUnique({ where: { email: payload.email } }),
		prisma.manager.findUnique({ where: { employeeId: payload.employeeId } }),
	]);

	if (existingUser) {
		throw new AppError(409, "A user with this email already exists");
	}
	if (existingEmployee) {
		throw new AppError(409, "A manager with this employee ID already exists");
	}

	const passwordHash = await hashPassword(payload.password);
	const fullName = payload.lastName
		? `${payload.firstName} ${payload.lastName}`
		: payload.firstName;

	return prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				name: fullName,
				email: payload.email,
				passwordHash,
				role: UserRole.MANAGER,
				status: UserStatus.ACTIVE,
				schoolId,
				...(payload.phone !== undefined ? { phone: payload.phone } : {}),
			},
		});

		return tx.manager.create({
			data: {
				userId: user.id,
				schoolId,
				employeeId: payload.employeeId,
				firstName: payload.firstName,
				...(payload.lastName !== undefined
					? { lastName: payload.lastName }
					: {}),
				...(payload.phone !== undefined ? { phone: payload.phone } : {}),
				...(payload.address !== undefined ? { address: payload.address } : {}),
				...(payload.dateOfBirth !== undefined
					? { dateOfBirth: payload.dateOfBirth }
					: {}),
				...(payload.joiningDate !== undefined
					? { joiningDate: payload.joiningDate }
					: {}),
				...(payload.designation !== undefined
					? { designation: payload.designation }
					: {}),
			},
			include: managerInclude,
		});
	});
};

export const getManagers = async (schoolId: number) => {
	return prisma.manager.findMany({
		where: { schoolId },
		include: managerInclude,
		orderBy: { createdAt: "desc" },
	});
};

export const getManagerById = async (schoolId: number, id: number) => {
	const manager = await prisma.manager.findFirst({
		where: { id, schoolId },
		include: managerInclude,
	});
	if (!manager) throw new AppError(404, "Manager not found");
	return manager;
};

export const updateManager = async (
	schoolId: number,
	id: number,
	payload: UpdateManagerInput,
) => {
	const existing = await prisma.manager.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Manager not found");

	const nextFirstName = payload.firstName ?? existing.firstName;
	const nextLastName =
		payload.lastName !== undefined ? payload.lastName : existing.lastName;
	const nextFullName = nextLastName
		? `${nextFirstName} ${nextLastName}`
		: nextFirstName;

	return prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: existing.userId },
			data: {
				name: nextFullName,
				...(payload.phone !== undefined ? { phone: payload.phone } : {}),
				...(payload.isActive !== undefined
					? {
							status: payload.isActive
								? UserStatus.ACTIVE
								: UserStatus.INACTIVE,
						}
					: {}),
			},
		});

		return tx.manager.update({
			where: { id },
			data: {
				...(payload.firstName !== undefined
					? { firstName: payload.firstName }
					: {}),
				...(payload.lastName !== undefined
					? { lastName: payload.lastName }
					: {}),
				...(payload.phone !== undefined ? { phone: payload.phone } : {}),
				...(payload.address !== undefined ? { address: payload.address } : {}),
				...(payload.dateOfBirth !== undefined
					? { dateOfBirth: payload.dateOfBirth }
					: {}),
				...(payload.designation !== undefined
					? { designation: payload.designation }
					: {}),
				...(payload.isActive !== undefined
					? { isActive: payload.isActive }
					: {}),
			},
			include: managerInclude,
		});
	});
};

export const deleteManager = async (schoolId: number, id: number) => {
	const existing = await prisma.manager.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Manager not found");

	return prisma.$transaction(async (tx) => {
		const updated = await tx.manager.update({
			where: { id },
			data: { isActive: false },
			include: managerInclude,
		});
		await tx.user.update({
			where: { id: existing.userId },
			data: { status: UserStatus.INACTIVE },
		});
		return updated;
	});
};

export const resetManagerPassword = async (
	schoolId: number,
	managerId: number,
	newPassword?: string,
) => {
	const manager = await prisma.manager.findFirst({
		where: { id: managerId, schoolId },
		include: {
			user: { select: { id: true, name: true, email: true, phone: true } },
		},
	});

	if (!manager) {
		throw new AppError(404, "Manager not found");
	}

	const rawPassword =
		newPassword?.trim() ||
		`Mgr@${Math.random().toString(36).slice(-4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
	if (rawPassword.length < 6) {
		throw new AppError(400, "Password must be at least 6 characters");
	}

	const passwordHash = await hashPassword(rawPassword);
	const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

	await prisma.user.update({
		where: { id: manager.user.id },
		data: {
			passwordHash,
			passwordChangedAt: changedAt,
			mustChangePassword: true,
		},
	});

	return {
		managerId: manager.id,
		name: manager.user.name,
		email: manager.user.email,
		phone: manager.user.phone,
		temporaryPassword: rawPassword,
	};
};
