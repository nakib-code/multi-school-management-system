import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { generateToken } from "../../utils/jwt.js";
import { comparePassword } from "../../utils/password.js";
import type { LoginInput } from "./interface.js";

export const login = async (payload: LoginInput) => {
	const { email, password } = payload;

	const user = await prisma.user.findUnique({
		where: { email },

		include: {
			school: true,
		},
	});

	if (!user) {
		throw new AppError(401, "Invalid email or password");
	}

	if (user.status !== "ACTIVE") {
		throw new AppError(403, "Your account is not active");
	}

	// ----------------------------------------------------
	// Guardian login is not supported yet
	// ----------------------------------------------------

	if (user.role === "GUARDIAN") {
		throw new AppError(403, "Guardian login is not available");
	}

	// ----------------------------------------------------
	// Check school status
	// ----------------------------------------------------

	if (user.role !== "SUPER_ADMIN" && user.school?.status !== "ACTIVE") {
		throw new AppError(403, "Your school is not active");
	}

	// ----------------------------------------------------
	// Check password
	// ----------------------------------------------------

	const isPasswordMatched = await comparePassword(password, user.passwordHash);

	if (!isPasswordMatched) {
		throw new AppError(401, "Invalid email or password");
	}

	// ----------------------------------------------------
	// Generate JWT
	// ----------------------------------------------------

	const token = generateToken({
		userId: user.id,
		role: user.role,

		...(user.schoolId !== null && {
			schoolId: user.schoolId,
		}),
	});

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			phone: user.phone,
			role: user.role,
			status: user.status,
			schoolId: user.schoolId,
			mustChangePassword: user.mustChangePassword,
		},

		token,
	};
};

export const googleAdminLogin = async (email: string) => {
	const user = await prisma.user.findUnique({
		where: {
			email,
		},
		include: {
			school: true,
		},
	});

	if (!user) {
		throw new AppError(404, "No account found with this Google email");
	}

	if (user.role !== "ADMIN") {
		throw new AppError(
			403,
			"Google login is available only for ADMIN accounts",
		);
	}

	if (user.status !== "ACTIVE") {
		throw new AppError(403, "Your account is not active");
	}

	if (!user.school) {
		throw new AppError(403, "Your account is not associated with a school");
	}

	if (user.school.status !== "ACTIVE") {
		throw new AppError(403, "Your school is not active");
	}

	const token = generateToken({
		userId: user.id,
		role: "ADMIN",
		schoolId: user.schoolId!,
	});

	await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			lastLoginAt: new Date(),
		},
	});

	return {
		token,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			status: user.status,
			schoolId: user.schoolId,
		},
	};
};
