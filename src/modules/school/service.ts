import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";
import { sendVerificationEmail } from "../../utils/sendEmail.js";
import {
	deleteVerificationCode,
	generateVerificationCode,
	getVerificationCode,
	saveVerificationCode,
} from "../../utils/verificationCode.js";
import type {
	CreateSchoolInput,
	RejectSchoolInput,
	VerifyAdminEmailInput,
} from "./interface.js";

export const createSchool = async (payload: CreateSchoolInput) => {
	const {
		name,
		code,
		email,
		phone,
		address,
		logo,
		adminName,
		adminEmail,
		adminPhone,
		adminPassword,
	} = payload;

	// ----------------------------------------------------
	// Check school code
	// ----------------------------------------------------

	const existingSchool = await prisma.school.findUnique({
		where: {
			code,
		},
	});

	if (existingSchool) {
		throw new AppError(409, "A school with this code already exists");
	}

	// ----------------------------------------------------
	// Check admin email
	// ----------------------------------------------------

	const existingAdmin = await prisma.user.findUnique({
		where: {
			email: adminEmail,
		},
	});

	if (existingAdmin) {
		throw new AppError(409, "A user with this admin email already exists");
	}

	// ----------------------------------------------------
	// Hash admin password
	// ----------------------------------------------------

	const adminPasswordHash = await hashPassword(adminPassword);

	// ----------------------------------------------------
	// Generate email verification code
	// ----------------------------------------------------

	const verificationCode = generateVerificationCode();

	// ----------------------------------------------------
	// Save verification code in Redis
	// ----------------------------------------------------

	await saveVerificationCode(adminEmail, verificationCode);

	// ----------------------------------------------------
	// Create school as PENDING
	// ----------------------------------------------------

	const school = await prisma.school.create({
		data: {
			name,
			code,

			...(email !== undefined
				? {
						email,
					}
				: {}),

			...(phone !== undefined
				? {
						phone,
					}
				: {}),

			...(address !== undefined
				? {
						address,
					}
				: {}),

			...(logo !== undefined
				? {
						logo,
					}
				: {}),

			status: "PENDING",

			adminName,

			adminEmail,

			...(adminPhone !== undefined
				? {
						adminPhone,
					}
				: {}),

			adminPasswordHash,

			adminEmailVerified: false,
		},
	});

	// ----------------------------------------------------
	// Send verification email
	// ----------------------------------------------------

	try {
		await sendVerificationEmail(adminEmail, verificationCode);
	} catch (error) {
		// Remove Redis code if email sending fails
		await deleteVerificationCode(adminEmail);

		// Remove created school
		await prisma.school.delete({
			where: {
				id: school.id,
			},
		});

		console.error("Failed to send verification email:", error);

		throw new AppError(500, "Failed to send verification email");
	}

	// ----------------------------------------------------
	// Return response
	// ----------------------------------------------------

	return {
		school: {
			id: school.id,
			name: school.name,
			code: school.code,
			email: school.email,
			phone: school.phone,
			address: school.address,
			logo: school.logo,
			status: school.status,
		},

		admin: {
			name: school.adminName,
			email: school.adminEmail,
			phone: school.adminPhone,
			emailVerified: school.adminEmailVerified,
		},

		message: "School registration submitted. Please verify the admin email.",
	};
};
export const approveSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	// ----------------------------------------------------
	// Check school status
	// ----------------------------------------------------

	if (school.status !== "PENDING") {
		throw new AppError(
			400,
			`School cannot be approved from ${school.status} status`,
		);
	}

	// ----------------------------------------------------
	// Check admin information
	// ----------------------------------------------------

	if (!school.adminEmail || !school.adminName || !school.adminPasswordHash) {
		throw new AppError(400, "School admin information is incomplete");
	}

	// ----------------------------------------------------
	// Admin email must be verified
	// ----------------------------------------------------

	if (!school.adminEmailVerified) {
		throw new AppError(
			400,
			"Admin email must be verified before school approval",
		);
	}

	// ----------------------------------------------------
	// Store non-null values
	// ----------------------------------------------------

	const adminName = school.adminName;
	const adminEmail = school.adminEmail;
	const adminPasswordHash = school.adminPasswordHash;

	// ----------------------------------------------------
	// Check if admin already exists
	// ----------------------------------------------------

	const existingAdmin = await prisma.user.findUnique({
		where: {
			email: adminEmail,
		},
	});

	if (existingAdmin) {
		throw new AppError(409, "A user with this admin email already exists");
	}

	// ----------------------------------------------------
	// Activate school + create admin
	// ----------------------------------------------------

	const result = await prisma.$transaction(async (tx) => {
		// Activate school
		const updatedSchool = await tx.school.update({
			where: {
				id: schoolId,
			},
			data: {
				status: "ACTIVE",
			},
		});

		// Create Admin using registration password
		const admin = await tx.user.create({
			data: {
				name: adminName,
				email: adminEmail,

				...(school.adminPhone !== null
					? {
							phone: school.adminPhone,
						}
					: {}),

				passwordHash: adminPasswordHash,

				role: "ADMIN",

				status: "ACTIVE",

				mustChangePassword: false,

				schoolId,
			},
		});

		return {
			school: updatedSchool,
			admin,
		};
	});

	// ----------------------------------------------------
	// Response
	// ----------------------------------------------------

	return {
		school: result.school,

		admin: {
			id: result.admin.id,
			name: result.admin.name,
			email: result.admin.email,
			phone: result.admin.phone,
			role: result.admin.role,
			schoolId: result.admin.schoolId,
			mustChangePassword: result.admin.mustChangePassword,
		},
	};
};

export const verifyAdminEmail = async (payload: VerifyAdminEmailInput) => {
	const { email, code } = payload;

	// Find school by admin email
	const school = await prisma.school.findFirst({
		where: {
			adminEmail: email,
			status: "PENDING",
		},
	});

	if (!school) {
		throw new AppError(404, "Pending school registration not found");
	}

	// Already verified
	if (school.adminEmailVerified) {
		throw new AppError(400, "Admin email is already verified");
	}

	// Get OTP from Redis
	const savedCode = await getVerificationCode(email);

	if (!savedCode) {
		throw new AppError(400, "Verification code has expired or is invalid");
	}

	// Compare OTP
	if (savedCode !== code) {
		throw new AppError(400, "Invalid verification code");
	}

	// Mark email as verified
	const updatedSchool = await prisma.school.update({
		where: {
			id: school.id,
		},
		data: {
			adminEmailVerified: true,
		},
	});

	// Delete OTP from Redis
	await deleteVerificationCode(email);

	return {
		schoolId: updatedSchool.id,
		adminEmail: updatedSchool.adminEmail,
		emailVerified: updatedSchool.adminEmailVerified,
	};
};

export const blockSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status === "BLOCKED") {
		throw new AppError(400, "School is already blocked");
	}

	if (school.status !== "ACTIVE") {
		throw new AppError(
			400,
			`School cannot be blocked from ${school.status} status`,
		);
	}

	const updatedSchool = await prisma.school.update({
		where: { id: schoolId },
		data: {
			status: "BLOCKED",
		},
	});

	return updatedSchool;
};

export const unblockSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status === "ACTIVE") {
		throw new AppError(400, "School is already active");
	}

	if (school.status !== "BLOCKED") {
		throw new AppError(
			400,
			`School cannot be unblocked from ${school.status} status`,
		);
	}

	const updatedSchool = await prisma.school.update({
		where: { id: schoolId },
		data: {
			status: "ACTIVE",
		},
	});

	return updatedSchool;
};

export const rejectSchool = async (
	schoolId: number,
	payload: RejectSchoolInput,
) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status !== "PENDING") {
		throw new AppError(
			400,
			`School cannot be rejected from ${school.status} status`,
		);
	}

	const updatedSchool = await prisma.school.update({
		where: { id: schoolId },
		data: {
			status: "REJECTED",
			rejectionReason: payload.rejectionReason,
		},
	});

	return updatedSchool;
};

export const deleteSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: { id: schoolId },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status !== "REJECTED") {
		throw new AppError(
			400,
			`Only rejected schools can be deleted. Current status: ${school.status}`,
		);
	}

	await prisma.school.delete({
		where: {
			id: schoolId,
		},
	});

	return {
		schoolId,
		deleted: true,
	};
};
