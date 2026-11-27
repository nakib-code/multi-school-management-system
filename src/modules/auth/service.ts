import { prisma } from "../../lib/prisma.js";
import { DEFAULT_SCHOOL_FEATURES } from "../../middleware/schoolFeature.js";
import AppError from "../../utils/appError.js";
import { generateToken } from "../../utils/jwt.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import { getPhoneLookupVariants } from "../../utils/phone.js";
import type { LoginInput } from "./interface.js";

const buildSchoolSettingPayload = (
	schoolId: number | null,
	setting?: {
		hasGeneralSection: boolean;
		hasHefzSection: boolean;
		hasPublicWebsite: boolean;
		hasOnlineAdmission: boolean;
		hasTeacherPayroll: boolean;
		smsEnabled: boolean;
		bkashNumber: string | null;
		bkashType: string;
		nagadNumber: string | null;
		nagadType: string;
		rocketNumber: string | null;
		rocketType: string;
		feePaymentInstruction: string | null;
	} | null,
) => {
	if (schoolId === null) return null;

	return {
		hasGeneralSection:
			setting?.hasGeneralSection ?? DEFAULT_SCHOOL_FEATURES.hasGeneralSection,
		hasHefzSection:
			setting?.hasHefzSection ?? DEFAULT_SCHOOL_FEATURES.hasHefzSection,
		hasPublicWebsite:
			setting?.hasPublicWebsite ?? DEFAULT_SCHOOL_FEATURES.hasPublicWebsite,
		hasOnlineAdmission:
			setting?.hasOnlineAdmission ?? DEFAULT_SCHOOL_FEATURES.hasOnlineAdmission,
		hasTeacherPayroll:
			setting?.hasTeacherPayroll ?? DEFAULT_SCHOOL_FEATURES.hasTeacherPayroll,
		smsEnabled: setting?.smsEnabled ?? DEFAULT_SCHOOL_FEATURES.smsEnabled,
		bkashNumber: setting?.bkashNumber ?? null,
		bkashType: setting?.bkashType ?? "PERSONAL",
		nagadNumber: setting?.nagadNumber ?? null,
		nagadType: setting?.nagadType ?? "PERSONAL",
		rocketNumber: setting?.rocketNumber ?? null,
		rocketType: setting?.rocketType ?? "PERSONAL",
		feePaymentInstruction: setting?.feePaymentInstruction ?? null,
	};
};

export const login = async (payload: LoginInput) => {
	const identifier = payload.email.trim();
	const normalizedEmail = identifier.toLowerCase();
	const phoneVariants = getPhoneLookupVariants(identifier);
	const { password } = payload;

	const user = await prisma.user.findFirst({
		where: {
			OR: [{ email: normalizedEmail }, { phone: { in: phoneVariants } }],
		},
		include: {
			school: {
				include: {
					schoolSetting: true,
				},
			},
		},
	});

	if (!user) {
		throw new AppError(401, "Invalid email/phone or password");
	}

	if (user.status !== "ACTIVE") {
		throw new AppError(403, "Your account is not active");
	}

	// SUPER_ADMIN does not need a school.
	// All other dashboard users must be associated with a school.
	if (user.role !== "SUPER_ADMIN" && user.schoolId === null) {
		throw new AppError(403, "Your account is not associated with any school");
	}

	if (user.role !== "SUPER_ADMIN" && user.school?.status !== "ACTIVE") {
		throw new AppError(403, "Your school is not active");
	}

	const isPasswordMatched = await comparePassword(password, user.passwordHash);

	if (!isPasswordMatched) {
		throw new AppError(401, "Invalid email/phone or password");
	}

	const tokenPayload: {
		userId: number;
		role: typeof user.role;
		schoolId?: number;
	} = {
		userId: user.id,
		role: user.role,
	};

	if (user.schoolId !== null) {
		tokenPayload.schoolId = user.schoolId;
	}

	const token = generateToken(tokenPayload);

	await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			lastLoginAt: new Date(),
		},
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
			schoolSetting: buildSchoolSettingPayload(
				user.schoolId,
				user.school?.schoolSetting,
			),
		},
		token,
	};
};

// ====================================================
// GOOGLE ADMIN LOGIN
// ====================================================

export const googleAdminLogin = async (email: string) => {
	const user = await prisma.user.findUnique({
		where: {
			email,
		},
		include: {
			school: {
				include: {
					schoolSetting: true,
				},
			},
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

	const schoolId = user.schoolId;

	if (schoolId === null) {
		throw new AppError(403, "Your account is not associated with a school");
	}

	const token = generateToken({
		userId: user.id,
		role: "ADMIN",
		schoolId,
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
			mustChangePassword: user.mustChangePassword,
			schoolSetting: buildSchoolSettingPayload(
				user.schoolId,
				user.school.schoolSetting,
			),
		},
	};
};

// ====================================================
// GET CURRENT USER
// ====================================================

export const getMe = async (userId: number) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		include: {
			school: {
				include: {
					schoolSetting: true,
				},
			},
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	if (user.status !== "ACTIVE") {
		throw new AppError(403, "Your account is not active");
	}

	if (user.role !== "SUPER_ADMIN" && user.schoolId === null) {
		throw new AppError(403, "Your account is not associated with any school");
	}

	if (user.role !== "SUPER_ADMIN" && user.school?.status !== "ACTIVE") {
		throw new AppError(403, "Your school is not active");
	}

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		phone: user.phone,
		role: user.role,
		status: user.status,
		schoolId: user.schoolId,
		mustChangePassword: user.mustChangePassword,
		schoolSetting: buildSchoolSettingPayload(
			user.schoolId,
			user.school?.schoolSetting,
		),
	};
};

export const changePassword = async (
	userId: number,
	payload: { currentPassword: string; newPassword: string },
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			school: {
				include: { schoolSetting: true },
			},
		},
	});

	if (!user) {
		throw new AppError(404, "User not found");
	}

	if (user.status !== "ACTIVE") {
		throw new AppError(403, "Your account is not active");
	}

	const isValid = await comparePassword(
		payload.currentPassword,
		user.passwordHash,
	);
	if (!isValid) {
		throw new AppError(400, "Current password is incorrect");
	}

	const newHash = await hashPassword(payload.newPassword);
	// Align passwordChangedAt to whole seconds so the newly issued JWT's iat is >= passwordChangedAt
	const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			passwordHash: newHash,
			passwordChangedAt: changedAt,
			mustChangePassword: false,
		},
	});

	const token = generateToken({
		userId: user.id,
		role: user.role,
		...(user.schoolId !== null && { schoolId: user.schoolId }),
	});

	return {
		token,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			phone: user.phone,
			role: user.role,
			status: user.status,
			schoolId: user.schoolId,
			mustChangePassword: false,
			schoolSetting: buildSchoolSettingPayload(
				user.schoolId,
				user.school?.schoolSetting,
			),
		},
	};
};
