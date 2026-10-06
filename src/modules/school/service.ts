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
	GetSchoolUsersQuery,
	RejectSchoolInput,
	VerifyAdminEmailInput,
} from "./interface.js";

// ============================================
// Public School Registration
// ============================================

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

	// Check school code
	const existingSchool = await prisma.school.findUnique({
		where: {
			code,
		},
	});

	if (existingSchool) {
		throw new AppError(409, "A school with this code already exists");
	}

	// Check admin email
	const existingAdmin = await prisma.user.findUnique({
		where: {
			email: adminEmail,
		},
	});

	if (existingAdmin) {
		throw new AppError(409, "A user with this admin email already exists");
	}

	// Hash admin password
	const adminPasswordHash = await hashPassword(adminPassword);

	// Generate verification code
	const verificationCode = generateVerificationCode();

	// Save OTP
	await saveVerificationCode(adminEmail, verificationCode);

	// Create school registration
	const school = await prisma.school.create({
		data: {
			name,
			code,

			...(email !== undefined && {
				email,
			}),

			...(phone !== undefined && {
				phone,
			}),

			...(address !== undefined && {
				address,
			}),

			...(logo !== undefined && {
				logo,
			}),

			status: "PENDING",

			adminName,
			adminEmail,

			...(adminPhone !== undefined && {
				adminPhone,
			}),

			adminPasswordHash,
			adminEmailVerified: false,
		},
	});

	// Send verification email
	try {
		await sendVerificationEmail(adminEmail, verificationCode);
	} catch (error) {
		await deleteVerificationCode(adminEmail);

		await prisma.school.delete({
			where: {
				id: school.id,
			},
		});

		console.error("Failed to send verification email:", error);

		throw new AppError(500, "Failed to send verification email");
	}

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

// ============================================
// Super Admin - School Management
// ============================================

export const getSchools = async ({
	page = 1,
	limit = 10,
	search = "",
	status,
}: {
	page?: number;
	limit?: number;
	search?: string;
	status?: "PENDING" | "ACTIVE" | "BLOCKED" | "REJECTED";
}) => {
	const skip = (page - 1) * limit;

	const where = {
		...(status && {
			status,
		}),

		...(search && {
			OR: [
				{
					name: {
						contains: search,
						mode: "insensitive" as const,
					},
				},
				{
					code: {
						contains: search,
						mode: "insensitive" as const,
					},
				},
				{
					email: {
						contains: search,
						mode: "insensitive" as const,
					},
				},
				{
					adminEmail: {
						contains: search,
						mode: "insensitive" as const,
					},
				},
			],
		}),
	};

	const [schools, total] = await Promise.all([
		prisma.school.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				id: "desc",
			},
		}),

		prisma.school.count({
			where,
		}),
	]);

	return {
		schools,

		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

// ============================================
// Approve School
// ============================================

export const approveSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	// School must be pending
	if (school.status !== "PENDING") {
		throw new AppError(
			400,
			`School cannot be approved from ${school.status} status`,
		);
	}

	// Admin information
	if (!school.adminEmail || !school.adminName || !school.adminPasswordHash) {
		throw new AppError(400, "School admin information is incomplete");
	}

	// Admin email must be verified
	if (!school.adminEmailVerified) {
		throw new AppError(
			400,
			"Admin email must be verified before school approval",
		);
	}

	// Check admin already exists
	const existingAdmin = await prisma.user.findUnique({
		where: {
			email: school.adminEmail,
		},
	});

	if (existingAdmin) {
		throw new AppError(409, "A user with this admin email already exists");
	}

	const adminName = school.adminName;
	const adminEmail = school.adminEmail;
	const adminPasswordHash = school.adminPasswordHash;

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

		// Create admin
		const admin = await tx.user.create({
			data: {
				name: adminName,
				email: adminEmail,

				...(school.adminPhone !== null && {
					phone: school.adminPhone,
				}),

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

		message:
			"School approved successfully. Admin can now login and choose a subscription package.",
	};
};

// ============================================
// Verify Admin Email
// ============================================

export const verifyAdminEmail = async (payload: VerifyAdminEmailInput) => {
	const { email, code } = payload;

	// Find pending school
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

	// Delete OTP
	await deleteVerificationCode(email);

	return {
		schoolId: updatedSchool.id,
		adminEmail: updatedSchool.adminEmail,
		emailVerified: updatedSchool.adminEmailVerified,
	};
};

// ============================================
// Block School
// ============================================

export const blockSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
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
		where: {
			id: schoolId,
		},

		data: {
			status: "BLOCKED",
		},
	});

	return updatedSchool;
};

// ============================================
// Unblock School
// ============================================

export const unblockSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
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
		where: {
			id: schoolId,
		},

		data: {
			status: "ACTIVE",
		},
	});

	return updatedSchool;
};

// ============================================
// Reject School
// ============================================

export const rejectSchool = async (
	schoolId: number,
	payload: RejectSchoolInput,
) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
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
		where: {
			id: schoolId,
		},

		data: {
			status: "REJECTED",
			rejectionReason: payload.rejectionReason,
		},
	});

	return updatedSchool;
};

// ============================================
// Delete School
// ============================================

export const deleteSchool = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	// Only rejected schools can be deleted
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

// ============================================
// School User Summary
// ============================================

export const getSchoolUserSummary = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},

		select: {
			id: true,
			name: true,
			code: true,
			status: true,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const [total, admin, manager, teacher, student, guardian] = await Promise.all(
		[
			prisma.user.count({
				where: {
					schoolId,
				},
			}),

			prisma.user.count({
				where: {
					schoolId,
					role: "ADMIN",
				},
			}),

			prisma.user.count({
				where: {
					schoolId,
					role: "MANAGER",
				},
			}),

			prisma.user.count({
				where: {
					schoolId,
					role: "TEACHER",
				},
			}),

			prisma.user.count({
				where: {
					schoolId,
					role: "STUDENT",
				},
			}),

			prisma.user.count({
				where: {
					schoolId,
					role: "GUARDIAN",
				},
			}),
		],
	);

	return {
		school,

		counts: {
			total,
			admin,
			manager,
			teacher,
			student,
			guardian,
		},
	};
};

// ============================================
// School Users
// ============================================

export const getSchoolUsers = async (
	schoolId: number,
	query: GetSchoolUsersQuery,
) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const search = query.search?.trim() || "";
	const role = query.role;
	const status = query.status;

	// Check school
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},

		select: {
			id: true,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const skip = (page - 1) * limit;

	const where = {
		schoolId,

		...(search
			? {
					OR: [
						{
							name: {
								contains: search,
								mode: "insensitive" as const,
							},
						},

						{
							email: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
					],
				}
			: {}),

		...(role
			? {
					role,
				}
			: {}),

		...(status
			? {
					status,
				}
			: {}),
	};

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where,

			skip,

			take: limit,

			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				role: true,
				status: true,
				schoolId: true,
				lastLoginAt: true,
				createdAt: true,
			},

			orderBy: {
				createdAt: "desc",
			},
		}),

		prisma.user.count({
			where,
		}),
	]);

	return {
		users,

		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};


// ============================================
// Public - School Details
// ============================================

export const getPublicSchoolById = async (schoolId: number) => {
        const school = await prisma.school.findFirst({
                where: {
                        id: schoolId,
                        status: "ACTIVE",
                },
                select: {
                        id: true,
                        name: true,
                        code: true,
                        email: true,
                        phone: true,
                        address: true,
                        logo: true,
                        status: true,
                },
        });

        if (!school) {
                throw new AppError(404, "School not found");
        }

        return school;
};