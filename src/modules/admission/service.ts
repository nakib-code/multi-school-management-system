import {
	type AcademicGroup,
	type AdmissionPaymentMethod,
	type AdmissionPaymentStatus,
	type AdmissionStatus,
	type HefzWing,
	Prisma,
	type ResidentialType,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";
import {
	generateTemporaryPassword,
	getPhoneLookupVariants,
	normalizePhone,
} from "../../utils/phone.js";
import {
	deleteVerificationCode,
	getVerificationCode,
} from "../../utils/verificationCode.js";
import type {
	ConfirmCashPaymentInput,
	CreateAdmissionInput,
	GetAdmissionsQuery,
	TrackAdmissionInput,
	VerifyStudentEmailInput,
} from "./interface.js";

const parseAcademicGroup = (
	academicGroup?: string | null,
	legacyGroup?: string | null,
): AcademicGroup | undefined => {
	const raw = (academicGroup || legacyGroup || "").trim().toUpperCase();
	if (raw === "SCIENCE" || raw === "ARTS" || raw === "COMMERCE") {
		return raw as AcademicGroup;
	}
	return undefined;
};

/**
 * Create Admission (Public — Guardian-Centric, No Forced Student Login/OTP)
 */
export const createAdmission = async (payload: CreateAdmissionInput) => {
	const {
		schoolId,

		// Stage 1 — Student
		studentName,
		dateOfBirth,
		gender,
		residentialType,

		// Stage 1 — Academic
		classId,
		sectionId,
		academicYear,
		shift,
		academicGroup,
		group,
		quranWing,

		// Stage 1 — Guardian
		guardianName,
		guardianPhone,
		guardianRelationship,
		guardianEmail,
		guardianNid,
		guardianOccupation,

		// Optional Student Login
		studentEmail,
		password,

		// Stage 2 — Optional
		nameBangla,
		birthRegNo,
		bloodGroup,
		previousSchool,
		previousClass,
		fatherName,
		motherName,
		address,
		presentAddress,
		permanentAddress,

		// Documents
		studentPhotoUrl,
		birthCertificateUrl,
		previousCertificateUrl,
		guardianNidUrl,
		previousTcUrl,
		marksheetUrl,

		// Payment
		paymentMethod,
	} = payload;

	const school = await prisma.school.findUnique({
		where: { id: schoolId },
		select: { id: true, name: true, status: true },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	if (school.status !== "ACTIVE") {
		throw new AppError(400, "Admission is not available for this school");
	}

	const schoolClass = await prisma.schoolClass.findFirst({
		where: { id: classId, schoolId, isActive: true },
		select: { id: true, name: true, code: true },
	});

	if (!schoolClass) {
		throw new AppError(404, "Selected class was not found or is inactive");
	}

	if (sectionId !== undefined) {
		const section = await prisma.section.findFirst({
			where: { id: sectionId, schoolId, classId, isActive: true },
			select: { id: true },
		});
		if (!section) {
			throw new AppError(404, "Selected section was not found for this class");
		}
	}

	const setting = await prisma.schoolSetting.findUnique({
		where: { schoolId },
		select: { admissionFee: true },
	});

	const normalizedEmail = studentEmail?.trim().toLowerCase() || undefined;
	const cleanGuardianPhone = normalizePhone(guardianPhone);

	if (normalizedEmail) {
		const existingUser = await prisma.user.findUnique({
			where: { email: normalizedEmail },
			select: { id: true },
		});
		if (existingUser) {
			throw new AppError(409, "A user with this student email already exists");
		}
	}

	const existingPending = await prisma.admission.findFirst({
		where: {
			schoolId,
			studentName: { equals: studentName.trim(), mode: "insensitive" },
			guardianPhone: cleanGuardianPhone,
			academicYear: academicYear.trim(),
			status: "PENDING",
		},
		select: { id: true },
	});

	if (existingPending) {
		throw new AppError(
			409,
			"A pending admission already exists for this student and guardian phone",
		);
	}

	const passwordHash = password ? await hashPassword(password) : undefined;
	const resolvedGroup = parseAcademicGroup(academicGroup, group);

	const applicationNo = `ADM-${Date.now()}-${Math.floor(
		1000 + Math.random() * 9000,
	)}`;

	const admissionFeeAmount = setting ? Number(setting.admissionFee) : 0;
	const hasAdmissionFee =
		Number.isFinite(admissionFeeAmount) && admissionFeeAmount > 0;

	const result = await prisma.$transaction(async (tx) => {
		const admission = await tx.admission.create({
			data: {
				schoolId,
				classId,
				...(sectionId !== undefined ? { sectionId } : {}),
				applicationNo,

				// Student
				studentName: studentName.trim(),
				...(nameBangla ? { nameBangla: nameBangla.trim() } : {}),
				...(normalizedEmail ? { studentEmail: normalizedEmail } : {}),
				...(passwordHash ? { passwordHash } : {}),
				dateOfBirth: new Date(dateOfBirth),
				gender: gender.trim().toUpperCase(),
				residentialType: (residentialType ??
					"NON_RESIDENTIAL") as ResidentialType,
				...(birthRegNo ? { birthRegNo: birthRegNo.trim() } : {}),
				...(bloodGroup ? { bloodGroup: bloodGroup.trim() } : {}),
				...(previousSchool ? { previousSchool: previousSchool.trim() } : {}),
				...(previousClass ? { previousClass: previousClass.trim() } : {}),

				// Guardian & Parents
				guardianName: guardianName.trim(),
				guardianPhone: cleanGuardianPhone,
				guardianRelationship: (
					guardianRelationship?.trim() || "FATHER"
				).toUpperCase(),
				...(guardianEmail
					? { guardianEmail: guardianEmail.trim().toLowerCase() }
					: {}),
				...(guardianNid ? { guardianNid: guardianNid.trim() } : {}),
				...(guardianOccupation
					? { guardianOccupation: guardianOccupation.trim() }
					: {}),
				...(fatherName ? { fatherName: fatherName.trim() } : {}),
				...(motherName ? { motherName: motherName.trim() } : {}),

				// Address
				...(address ? { address: address.trim() } : {}),
				...(presentAddress ? { presentAddress: presentAddress.trim() } : {}),
				...(permanentAddress
					? { permanentAddress: permanentAddress.trim() }
					: {}),

				// Application
				academicYear: academicYear.trim(),
				shift: (shift?.trim() || "MORNING").toUpperCase(),
				...(resolvedGroup
					? { academicGroup: resolvedGroup, group: resolvedGroup }
					: {}),
				...(quranWing ? { quranWing: quranWing as HefzWing } : {}),

				// Documents
				...(studentPhotoUrl ? { studentPhotoUrl } : {}),
				...(birthCertificateUrl ? { birthCertificateUrl } : {}),
				...(previousCertificateUrl ? { previousCertificateUrl } : {}),
				...(guardianNidUrl ? { guardianNidUrl } : {}),
				...(previousTcUrl ? { previousTcUrl } : {}),
				...(marksheetUrl ? { marksheetUrl } : {}),

				status: "PENDING",
				studentEmailVerified: true,
			},
		});

		let payment = null;
		if (hasAdmissionFee && setting) {
			const method: AdmissionPaymentMethod = paymentMethod ?? "CASH";
			payment = await tx.admissionPayment.create({
				data: {
					admissionId: admission.id,
					schoolId,
					amount: setting.admissionFee,
					paymentMethod: method,
					status: "PENDING",
				},
			});
		}

		return { admission, payment };
	});

	return {
		id: result.admission.id,
		schoolId: result.admission.schoolId,
		applicationNo: result.admission.applicationNo,
		studentName: result.admission.studentName,
		studentEmail: result.admission.studentEmail,
		guardianName: result.admission.guardianName,
		guardianPhone: result.admission.guardianPhone,
		classId: result.admission.classId,
		sectionId: result.admission.sectionId,
		academicYear: result.admission.academicYear,
		residentialType: result.admission.residentialType,
		academicGroup: result.admission.academicGroup,
		quranWing: result.admission.quranWing,
		status: result.admission.status,
		emailVerified: true,
		emailVerificationRequired: false,
		paymentMethod: result.payment?.paymentMethod ?? null,
		paymentStatus: result.payment?.status ?? null,
		payment: result.payment
			? {
					id: result.payment.id,
					amount: Number(result.payment.amount),
					paymentMethod: result.payment.paymentMethod,
					status: result.payment.status,
				}
			: null,
		createdAt: result.admission.createdAt,
	};
};

/**
 * Create Public Admission by School Slug
 */
export const createPublicAdmissionBySlug = async (
	slug: string,
	payload: Omit<CreateAdmissionInput, "schoolId">,
) => {
	const school = await prisma.school.findFirst({
		where: {
			OR: [{ slug: slug.trim() }, { code: slug.trim() }],
		},
		select: { id: true },
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	return createAdmission({
		...payload,
		schoolId: school.id,
	});
};

/**
 * Verify Student Email (Legacy endpoint retained for backward compatibility)
 */
export const verifyStudentEmail = async (payload: VerifyStudentEmailInput) => {
	const { email, code } = payload;
	const normalizedEmail = email.trim().toLowerCase();

	const admission = await prisma.admission.findFirst({
		where: { studentEmail: normalizedEmail, status: "PENDING" },
		select: {
			id: true,
			applicationNo: true,
			studentEmail: true,
			studentEmailVerified: true,
		},
	});

	if (!admission) {
		throw new AppError(404, "Pending admission not found");
	}

	if (admission.studentEmailVerified) {
		return {
			admissionId: admission.id,
			applicationNo: admission.applicationNo,
			studentEmail: admission.studentEmail,
			emailVerified: true,
		};
	}

	const savedCode = await getVerificationCode(normalizedEmail);
	if (!savedCode || savedCode !== code) {
		throw new AppError(400, "Invalid or expired verification code");
	}

	const updatedAdmission = await prisma.admission.update({
		where: { id: admission.id },
		data: { studentEmailVerified: true },
		select: {
			id: true,
			applicationNo: true,
			studentEmail: true,
			studentEmailVerified: true,
		},
	});

	await deleteVerificationCode(normalizedEmail);

	return {
		admissionId: updatedAdmission.id,
		applicationNo: updatedAdmission.applicationNo,
		studentEmail: updatedAdmission.studentEmail,
		emailVerified: updatedAdmission.studentEmailVerified,
	};
};

/**
 * Get Admissions
 */
export const getAdmissions = async (
	schoolId: number,
	query: GetAdmissionsQuery = {},
) => {
	const page = Math.max(1, query.page ?? 1);
	const limit = Math.min(100, Math.max(1, query.limit ?? 10));
	const skip = (page - 1) * limit;

	const where: Prisma.AdmissionWhereInput = { schoolId };

	if (query.search?.trim()) {
		const search = query.search.trim();
		where.OR = [
			{ applicationNo: { contains: search, mode: "insensitive" } },
			{ studentName: { contains: search, mode: "insensitive" } },
			{ studentEmail: { contains: search, mode: "insensitive" } },
			{ guardianName: { contains: search, mode: "insensitive" } },
			{ guardianPhone: { contains: search, mode: "insensitive" } },
		];
	}

	if (query.status) {
		where.status = query.status as AdmissionStatus;
	}

	if (query.paymentStatus) {
		where.payment = {
			is: { status: query.paymentStatus as AdmissionPaymentStatus },
		};
	}

	const [admissions, total] = await prisma.$transaction([
		prisma.admission.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				applicationNo: true,
				studentName: true,
				nameBangla: true,
				studentEmail: true,
				dateOfBirth: true,
				gender: true,
				residentialType: true,
				guardianName: true,
				guardianPhone: true,
				guardianRelationship: true,
				academicYear: true,
				shift: true,
				group: true,
				academicGroup: true,
				quranWing: true,
				studentPhotoUrl: true,
				status: true,
				studentEmailVerified: true,
				createdAt: true,
				updatedAt: true,
				class: { select: { id: true, name: true, code: true } },
				section: { select: { id: true, name: true, code: true } },
				payment: {
					select: {
						id: true,
						amount: true,
						paymentMethod: true,
						status: true,
						transactionId: true,
						paidAt: true,
					},
				},
			},
		}),
		prisma.admission.count({ where }),
	]);

	return {
		admissions: admissions.map((admission) => ({
			...admission,
			payment: admission.payment
				? {
						...admission.payment,
						amount: Number(admission.payment.amount),
					}
				: null,
		})),
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

/**
 * Get Admission By ID (Full Detail View)
 */
export const getAdmissionById = async (
	schoolId: number,
	admissionId: number,
) => {
	const admission = await prisma.admission.findFirst({
		where: { id: admissionId, schoolId },
		select: {
			id: true,
			schoolId: true,
			applicationNo: true,

			// Student
			studentName: true,
			nameBangla: true,
			studentEmail: true,
			dateOfBirth: true,
			gender: true,
			bloodGroup: true,
			birthRegNo: true,
			residentialType: true,
			previousSchool: true,
			previousClass: true,

			// Guardian & Parents
			guardianName: true,
			guardianEmail: true,
			guardianPhone: true,
			guardianRelationship: true,
			guardianNid: true,
			guardianOccupation: true,
			fatherName: true,
			motherName: true,

			// Address
			address: true,
			presentAddress: true,
			permanentAddress: true,

			// Application
			classId: true,
			sectionId: true,
			academicYear: true,
			shift: true,
			group: true,
			academicGroup: true,
			quranWing: true,

			// Documents
			studentPhotoUrl: true,
			birthCertificateUrl: true,
			previousCertificateUrl: true,
			guardianNidUrl: true,
			previousTcUrl: true,
			marksheetUrl: true,

			studentEmailVerified: true,
			status: true,
			reviewedAt: true,
			reviewedBy: true,
			rejectionReason: true,

			class: { select: { id: true, name: true, code: true } },
			section: { select: { id: true, name: true, code: true } },
			payment: {
				select: {
					id: true,
					amount: true,
					paymentMethod: true,
					status: true,
					transactionId: true,
					paidAt: true,
					receivedBy: true,
					remarks: true,
				},
			},
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!admission) {
		throw new AppError(404, "Admission not found");
	}

	return {
		...admission,
		payment: admission.payment
			? {
					...admission.payment,
					amount: Number(admission.payment.amount),
				}
			: null,
	};
};

/**
 * Track Admission (Public — by applicationNo + guardianPhone OR studentEmail)
 */
export const trackAdmission = async ({
	applicationNo,
	studentEmail,
	guardianPhone,
}: TrackAdmissionInput) => {
	const normalizedApplicationNo = applicationNo.trim().toUpperCase();
	const normalizedEmail = studentEmail?.trim().toLowerCase();
	const cleanPhone = guardianPhone?.trim();
	const phoneVariants = cleanPhone ? getPhoneLookupVariants(cleanPhone) : [];

	if (!normalizedApplicationNo) {
		throw new AppError(400, "Application number is required");
	}
	if (!normalizedEmail && !cleanPhone) {
		throw new AppError(400, "Guardian phone or student email is required");
	}

	const where: Prisma.AdmissionWhereInput = {
		applicationNo: normalizedApplicationNo,
		...(cleanPhone && normalizedEmail
			? {
					OR: [
						{ guardianPhone: { in: phoneVariants } },
						{ studentEmail: normalizedEmail },
					],
				}
			: cleanPhone
				? { guardianPhone: { in: phoneVariants } }
				: { studentEmail: normalizedEmail ?? null }),
	};

	const admission = await prisma.admission.findFirst({
		where,
		select: {
			id: true,
			schoolId: true,
			applicationNo: true,
			studentName: true,
			studentEmail: true,
			guardianName: true,
			guardianPhone: true,
			residentialType: true,
			academicYear: true,
			shift: true,
			group: true,
			academicGroup: true,
			quranWing: true,
			studentEmailVerified: true,
			status: true,
			rejectionReason: true,
			reviewedAt: true,
			class: { select: { id: true, name: true, code: true } },
			section: { select: { id: true, name: true, code: true } },
			school: { select: { id: true, name: true, code: true } },
			payment: {
				select: {
					id: true,
					amount: true,
					paymentMethod: true,
					status: true,
					transactionId: true,
					paidAt: true,
					remarks: true,
				},
			},
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!admission) {
		throw new AppError(404, "Admission application not found");
	}

	return {
		admissionId: admission.id,
		applicationNo: admission.applicationNo,
		student: {
			name: admission.studentName,
			email: admission.studentEmail,
			guardianName: admission.guardianName,
			guardianPhone: admission.guardianPhone,
			residentialType: admission.residentialType,
			emailVerified: admission.studentEmailVerified,
		},
		school: admission.school,
		academic: {
			year: admission.academicYear,
			class: admission.class,
			section: admission.section,
			shift: admission.shift,
			group: admission.academicGroup ?? admission.group,
			quranWing: admission.quranWing,
		},
		status: admission.status,
		rejectionReason: admission.rejectionReason,
		reviewedAt: admission.reviewedAt,
		payment: admission.payment
			? {
					id: admission.payment.id,
					amount: Number(admission.payment.amount),
					paymentMethod: admission.payment.paymentMethod,
					status: admission.payment.status,
					transactionId: admission.payment.transactionId,
					paidAt: admission.payment.paidAt,
					remarks: admission.payment.remarks,
				}
			: null,
		createdAt: admission.createdAt,
		updatedAt: admission.updatedAt,
	};
};

/**
 * Approve Admission
 * Atomically transfers ALL collected fields to Student + Enrollment + Guardian/GuardianStudent.
 * Does NOT require student email verification or forced student login account.
 */
export const approveAdmission = async (
	schoolId: number,
	admissionId: number,
	reviewerId: number,
) => {
	const admission = await prisma.admission.findFirst({
		where: { id: admissionId, schoolId },
		include: {
			payment: true,
			class: true,
			section: true,
		},
	});

	if (!admission) {
		throw new AppError(404, "Admission not found");
	}

	if (admission.status !== "PENDING") {
		throw new AppError(400, "Only pending admissions can be approved");
	}

	if (
		admission.payment &&
		Number(admission.payment.amount) > 0 &&
		admission.payment.status !== "PAID"
	) {
		throw new AppError(
			400,
			"Admission payment must be completed before approval",
		);
	}

	if (admission.studentEmail) {
		const existingUser = await prisma.user.findUnique({
			where: { email: admission.studentEmail },
			select: { id: true },
		});
		if (existingUser) {
			throw new AppError(409, "A user with this student email already exists");
		}
	}

	const nameParts = admission.studentName.trim().split(/\s+/);
	const firstName = nameParts[0] ?? admission.studentName.trim();
	const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

	const studentCode = `STU-${schoolId}-${Date.now()}-${Math.floor(
		1000 + Math.random() * 9000,
	)}`;

	const resolvedGroup = parseAcademicGroup(
		admission.academicGroup,
		admission.group,
	);

	const result = await prisma.$transaction(
		async (tx) => {
			const now = new Date();

			const activeSubscription = await tx.schoolSubscription.findFirst({
				where: {
					schoolId,
					status: "ACTIVE",
					startDate: { lte: now },
					endDate: { gte: now },
					package: { isActive: true },
				},
				include: {
					package: {
						select: { id: true, name: true, studentLimit: true },
					},
				},
				orderBy: { startDate: "desc" },
			});

			if (!activeSubscription) {
				throw new AppError(403, "School does not have an active subscription");
			}

			const currentStudentCount = await tx.student.count({
				where: { schoolId, isActive: true },
			});

			if (currentStudentCount >= activeSubscription.package.studentLimit) {
				throw new AppError(
					403,
					`Student limit reached for ${activeSubscription.package.name} package. Maximum allowed students: ${activeSubscription.package.studentLimit}`,
				);
			}

			if (admission.sectionId && admission.section) {
				const activeEnrollmentCount = await tx.enrollment.count({
					where: {
						sectionId: admission.sectionId,
						academicYear: admission.academicYear,
						status: "ACTIVE",
					},
				});

				if (
					admission.section.capacity !== null &&
					activeEnrollmentCount >= admission.section.capacity
				) {
					throw new AppError(400, "Selected section is already full");
				}
			}

			// 1. Optional Student User Login (only if email + password were provided)
			let studentUser: { id: number; email: string } | null = null;
			if (admission.studentEmail && admission.passwordHash) {
				studentUser = await tx.user.create({
					data: {
						name: admission.studentName,
						email: admission.studentEmail,
						passwordHash: admission.passwordHash,
						role: "STUDENT",
						status: "ACTIVE",
						mustChangePassword: false,
						schoolId,
					},
					select: { id: true, email: true },
				});
			}

			// Determine father/mother name fallback from guardian relationship
			const relUpper = (admission.guardianRelationship ?? "").toUpperCase();
			const derivedFatherName =
				admission.fatherName ||
				(relUpper === "FATHER" ? admission.guardianName : null);
			const derivedMotherName =
				admission.motherName ||
				(relUpper === "MOTHER" ? admission.guardianName : null);

			// 2. Create Student transferring ALL collected fields
			const student = await tx.student.create({
				data: {
					...(studentUser ? { userId: studentUser.id } : {}),
					schoolId,
					studentId: studentCode,
					firstName,
					lastName,
					...(admission.nameBangla ? { nameBangla: admission.nameBangla } : {}),
					...(admission.dateOfBirth
						? { dateOfBirth: admission.dateOfBirth }
						: {}),
					...(admission.gender ? { gender: admission.gender } : {}),
					...(admission.guardianPhone
						? { phone: admission.guardianPhone }
						: {}),
					...(admission.address || admission.presentAddress
						? { address: admission.presentAddress ?? admission.address }
						: {}),
					...(admission.presentAddress || admission.address
						? { presentAddress: admission.presentAddress ?? admission.address }
						: {}),
					...(admission.permanentAddress
						? { permanentAddress: admission.permanentAddress }
						: {}),
					residentialType: admission.residentialType,
					...(admission.shift ? { shift: admission.shift } : {}),
					...(resolvedGroup ? { academicGroup: resolvedGroup } : {}),
					...(admission.quranWing ? { quranWing: admission.quranWing } : {}),
					...(admission.bloodGroup ? { bloodGroup: admission.bloodGroup } : {}),
					...(admission.birthRegNo ? { birthRegNo: admission.birthRegNo } : {}),
					...(admission.previousSchool
						? { previousSchool: admission.previousSchool }
						: {}),
					...(admission.previousClass
						? { previousClass: admission.previousClass }
						: {}),
					...(derivedFatherName ? { fatherName: derivedFatherName } : {}),
					...(derivedMotherName ? { motherName: derivedMotherName } : {}),
					...(relUpper === "FATHER" && admission.guardianPhone
						? { fatherPhone: admission.guardianPhone }
						: {}),
					...(relUpper === "FATHER" && admission.guardianOccupation
						? { fatherOccupation: admission.guardianOccupation }
						: {}),
					...(relUpper === "FATHER" && admission.guardianNid
						? { fatherNid: admission.guardianNid }
						: {}),
					...(relUpper === "MOTHER" && admission.guardianPhone
						? { motherPhone: admission.guardianPhone }
						: {}),
					...(relUpper === "MOTHER" && admission.guardianOccupation
						? { motherOccupation: admission.guardianOccupation }
						: {}),
					...(relUpper === "MOTHER" && admission.guardianNid
						? { motherNid: admission.guardianNid }
						: {}),
					...(admission.studentPhotoUrl
						? { studentPhotoUrl: admission.studentPhotoUrl }
						: {}),
					...(admission.birthCertificateUrl
						? { birthCertificateUrl: admission.birthCertificateUrl }
						: {}),
					...(admission.guardianNidUrl
						? { guardianNidUrl: admission.guardianNidUrl }
						: {}),
					...(admission.previousTcUrl || admission.previousCertificateUrl
						? {
								previousTcUrl:
									admission.previousTcUrl ?? admission.previousCertificateUrl,
							}
						: {}),
					...(admission.marksheetUrl
						? { marksheetUrl: admission.marksheetUrl }
						: {}),
					admissionDate: now,
					isActive: true,
				},
			});

			// 3. Create Enrollment with sectionId, shift, academicGroup
			const enrollment = await tx.enrollment.create({
				data: {
					schoolId,
					studentId: student.id,
					classId: admission.classId,
					sectionId: admission.sectionId ?? null,
					academicYear: admission.academicYear,
					...(admission.shift ? { shift: admission.shift } : {}),
					...(resolvedGroup ? { academicGroup: resolvedGroup } : {}),
					status: "ACTIVE",
				},
			});

			// 4. Find or Create Guardian by (schoolId, guardianPhone) & Link via GuardianStudent
			let guardianSummary: {
				guardianId: number;
				name: string;
				phone: string;
				email: string;
				isExistingGuardian: boolean;
				temporaryPassword?: string;
			} | null = null;

			if (admission.guardianPhone?.trim()) {
				const cleanPhone = normalizePhone(admission.guardianPhone);
				const phoneVariants = getPhoneLookupVariants(admission.guardianPhone);
				const existingGuardian = await tx.guardian.findFirst({
					where: {
						schoolId,
						user: { phone: { in: phoneVariants } },
					},
					include: {
						user: {
							select: { id: true, name: true, email: true, phone: true },
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
						update: { isPrimary: true },
						create: {
							guardianId: existingGuardian.id,
							studentId: student.id,
							isPrimary: true,
						},
					});

					if (admission.guardianNid && !existingGuardian.nid) {
						await tx.guardian.update({
							where: { id: existingGuardian.id },
							data: { nid: admission.guardianNid },
						});
					}

					guardianSummary = {
						guardianId: existingGuardian.id,
						name: existingGuardian.user.name,
						phone: existingGuardian.user.phone ?? cleanPhone,
						email: existingGuardian.user.email,
						isExistingGuardian: true,
					};
				} else {
					const digits = cleanPhone.replace(/\D/g, "");
					const defaultPassword = generateTemporaryPassword();
					const gPasswordHash = await hashPassword(defaultPassword);

					let guardianEmail =
						admission.guardianEmail?.trim().toLowerCase() ||
						`guardian.${schoolId}.${digits || Date.now()}@madrasaos.local`;

					const emailConflict = await tx.user.findUnique({
						where: { email: guardianEmail },
						select: { id: true },
					});
					if (emailConflict) {
						guardianEmail = `guardian.${schoolId}.${digits || Date.now()}.${Math.floor(100 + Math.random() * 900)}@madrasaos.local`;
					}

					const guardianUser = await tx.user.create({
						data: {
							name:
								admission.guardianName?.trim() ||
								`Guardian of ${admission.studentName.trim()}`,
							email: guardianEmail,
							phone: cleanPhone,
							passwordHash: gPasswordHash,
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
							relation: admission.guardianRelationship?.trim() || "FATHER",
							...(admission.guardianOccupation
								? { occupation: admission.guardianOccupation }
								: {}),
							...(admission.presentAddress || admission.address
								? { address: admission.presentAddress ?? admission.address }
								: {}),
							...(admission.guardianNid ? { nid: admission.guardianNid } : {}),
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
						temporaryPassword: defaultPassword,
					};
				}
			}

			// 5. Update Admission Status
			const updatedAdmission = await tx.admission.update({
				where: { id: admission.id },
				data: {
					status: "APPROVED",
					reviewedAt: now,
					reviewedBy: reviewerId,
				},
			});

			return {
				admission: updatedAdmission,
				user: studentUser,
				student,
				enrollment,
				guardian: guardianSummary,
				package: activeSubscription.package,
				previousStudentCount: currentStudentCount,
			};
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		},
	);

	return {
		admissionId: result.admission.id,
		applicationNo: result.admission.applicationNo,
		studentId: result.student.studentId,
		studentRecordId: result.student.id,
		studentName: result.admission.studentName,
		studentEmail: result.user?.email ?? null,
		enrollmentId: result.enrollment.id,
		classId: result.enrollment.classId,
		sectionId: result.enrollment.sectionId,
		academicYear: result.enrollment.academicYear,
		guardian: result.guardian,
		status: result.admission.status,
		reviewedAt: result.admission.reviewedAt,
		subscription: {
			packageId: result.package.id,
			packageName: result.package.name,
			studentLimit: result.package.studentLimit,
			previousStudentCount: result.previousStudentCount,
			currentStudentCount: result.previousStudentCount + 1,
		},
	};
};

/**
 * Reject Admission
 */
export const rejectAdmission = async (
	schoolId: number,
	admissionId: number,
	reviewerId: number,
	rejectionReason: string,
) => {
	const admission = await prisma.admission.findFirst({
		where: { id: admissionId, schoolId },
	});

	if (!admission) {
		throw new AppError(404, "Admission not found");
	}

	if (admission.status !== "PENDING") {
		throw new AppError(400, "Only pending admissions can be rejected");
	}

	const updatedAdmission = await prisma.admission.update({
		where: { id: admissionId },
		data: {
			status: "REJECTED",
			rejectionReason: rejectionReason.trim(),
			reviewedAt: new Date(),
			reviewedBy: reviewerId,
		},
		select: {
			id: true,
			applicationNo: true,
			studentName: true,
			studentEmail: true,
			guardianPhone: true,
			status: true,
			rejectionReason: true,
			reviewedAt: true,
			reviewedBy: true,
		},
	});

	return updatedAdmission;
};

/**
 * Confirm Cash Payment
 */
export const confirmCashPayment = async (
	schoolId: number,
	admissionId: number,
	userId: number,
	input: ConfirmCashPaymentInput,
) => {
	const admission = await prisma.admission.findUnique({
		where: { id: admissionId },
		select: {
			id: true,
			schoolId: true,
			status: true,
			payment: {
				select: {
					id: true,
					schoolId: true,
					amount: true,
					paymentMethod: true,
					status: true,
					transactionId: true,
					paidAt: true,
					receivedBy: true,
					remarks: true,
				},
			},
		},
	});

	if (!admission) {
		throw new AppError(404, "Admission not found");
	}

	if (admission.schoolId !== schoolId) {
		throw new AppError(403, "You do not have access to this admission");
	}

	if (admission.status !== "PENDING") {
		throw new AppError(
			400,
			"Only pending admissions can receive payment confirmation",
		);
	}

	if (!admission.payment) {
		throw new AppError(404, "Admission payment not found");
	}

	if (admission.payment.paymentMethod !== "CASH") {
		throw new AppError(400, "This admission is not using cash payment");
	}

	if (admission.payment.status === "PAID") {
		throw new AppError(400, "Cash payment has already been confirmed");
	}

	if (admission.payment.status !== "PENDING") {
		throw new AppError(400, "Cash payment cannot be confirmed");
	}

	const payment = await prisma.admissionPayment.update({
		where: { id: admission.payment.id },
		data: {
			status: "PAID",
			paidAt: new Date(),
			receivedBy: userId,
			...(input.remarks !== undefined ? { remarks: input.remarks.trim() } : {}),
		},
		select: {
			id: true,
			admissionId: true,
			schoolId: true,
			amount: true,
			paymentMethod: true,
			status: true,
			transactionId: true,
			paidAt: true,
			receivedBy: true,
			remarks: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return {
		...payment,
		amount: Number(payment.amount),
	};
};

/**
 * Initiate Online / Mobile Banking Payment
 */
export const initiateOnlinePayment = async (
	schoolId: number,
	admissionId: number,
) => {
	const admission = await prisma.admission.findFirst({
		where: { id: admissionId, schoolId },
		include: {
			payment: true,
			school: {
				select: { name: true, email: true, phone: true, address: true },
			},
		},
	});

	if (!admission) {
		throw new AppError(404, "Admission not found");
	}

	if (admission.status !== "PENDING") {
		throw new AppError(400, "Only pending admissions can make payment");
	}

	if (!admission.payment) {
		throw new AppError(404, "Admission payment not found");
	}

	if (admission.payment.paymentMethod === "CASH") {
		throw new AppError(400, "This admission is using cash payment");
	}

	if (admission.payment.status === "PAID") {
		throw new AppError(400, "Admission payment is already completed");
	}

	if (admission.payment.status !== "PENDING") {
		throw new AppError(400, "Payment cannot be initiated");
	}

	const amount = Number(admission.payment.amount);
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new AppError(400, "Invalid admission payment amount");
	}

	const schoolSetting = await prisma.schoolSetting.findUnique({
		where: { schoolId },
		select: { bkashNumber: true, nagadNumber: true, rocketNumber: true },
	});

	return {
		admissionId: admission.id,
		schoolId,
		amount,
		supportedMethods: ["BKASH", "NAGAD", "ROCKET"] as const,
		receiverNumbers: {
			BKASH: schoolSetting?.bkashNumber ?? null,
			NAGAD: schoolSetting?.nagadNumber ?? null,
			ROCKET: schoolSetting?.rocketNumber ?? null,
		},
		message:
			"Please send the admission fee via bKash, Nagad, or Rocket and submit your transaction ID for manual verification.",
	};
};

/**
 * Public: Submit Online Payment TrxID via Application Tracking
 */
export const submitOnlinePaymentTrx = async (input: {
	applicationNo: string;
	guardianPhone?: string | undefined;
	studentEmail?: string | undefined;
	paymentMethod: "BKASH" | "NAGAD" | "ROCKET";
	transactionId: string;
	senderPhone?: string | undefined;
}) => {
	const normalizedApplicationNo = input.applicationNo.trim().toUpperCase();
	const normalizedEmail = input.studentEmail?.trim().toLowerCase();
	const cleanPhone = input.guardianPhone?.trim();
	const phoneVariants = cleanPhone ? getPhoneLookupVariants(cleanPhone) : [];
	const trxId = input.transactionId.trim().toUpperCase();

	if (!normalizedEmail && !cleanPhone) {
		throw new AppError(400, "Guardian phone or student email is required");
	}

	const where: Prisma.AdmissionWhereInput = {
		applicationNo: normalizedApplicationNo,
		...(cleanPhone && normalizedEmail
			? {
					OR: [
						{ guardianPhone: { in: phoneVariants } },
						{ studentEmail: normalizedEmail },
					],
				}
			: cleanPhone
				? { guardianPhone: { in: phoneVariants } }
				: { studentEmail: normalizedEmail ?? null }),
	};

	const admission = await prisma.admission.findFirst({
		where,
		include: { payment: true },
	});

	if (!admission) {
		throw new AppError(404, "Admission application not found");
	}

	if (admission.status !== "PENDING") {
		throw new AppError(
			400,
			"Payment can only be submitted for pending admissions",
		);
	}

	if (!admission.payment) {
		throw new AppError(404, "Admission payment record not found");
	}

	if (admission.payment.paymentMethod === "CASH") {
		throw new AppError(400, "This admission is configured for cash payment");
	}

	if (admission.payment.status === "PAID") {
		throw new AppError(400, "Admission payment is already verified");
	}

	const duplicateTrx = await prisma.admissionPayment.findFirst({
		where: {
			transactionId: trxId,
			id: { not: admission.payment.id },
		},
		select: { id: true },
	});

	if (duplicateTrx) {
		throw new AppError(409, "This transaction ID has already been used");
	}

	const remarks = input.senderPhone?.trim()
		? `Sender: ${input.senderPhone.trim()}`
		: null;

	const payment = await prisma.admissionPayment.update({
		where: { id: admission.payment.id },
		data: {
			paymentMethod: input.paymentMethod,
			transactionId: trxId,
			status: "PENDING",
			...(remarks !== null ? { remarks } : {}),
		},
		select: {
			id: true,
			admissionId: true,
			schoolId: true,
			amount: true,
			paymentMethod: true,
			status: true,
			transactionId: true,
			paidAt: true,
			remarks: true,
			updatedAt: true,
		},
	});

	return {
		...payment,
		amount: Number(payment.amount),
	};
};

/**
 * Verify Online Admission Payment (Admin / Manager)
 */
export const verifyOnlineAdmissionPayment = async (
	schoolId: number,
	admissionId: number,
	userId: number,
	input: { remarks?: string | undefined },
) => {
	const admission = await prisma.admission.findFirst({
		where: { id: admissionId, schoolId },
		include: { payment: true },
	});

	if (!admission) {
		throw new AppError(404, "Admission not found");
	}

	if (admission.status !== "PENDING") {
		throw new AppError(
			400,
			"Only pending admissions can receive payment verification",
		);
	}

	if (!admission.payment) {
		throw new AppError(404, "Admission payment not found");
	}

	if (admission.payment.paymentMethod === "CASH") {
		throw new AppError(400, "Use cash confirmation for cash payments");
	}

	if (admission.payment.status === "PAID") {
		throw new AppError(400, "Online payment is already verified");
	}

	if (!admission.payment.transactionId) {
		throw new AppError(400, "Applicant has not submitted a transaction ID yet");
	}

	const mergedRemarks = input.remarks?.trim()
		? admission.payment.remarks
			? `${admission.payment.remarks} | Verified: ${input.remarks.trim()}`
			: input.remarks.trim()
		: admission.payment.remarks;

	const payment = await prisma.admissionPayment.update({
		where: { id: admission.payment.id },
		data: {
			status: "PAID",
			paidAt: new Date(),
			receivedBy: userId,
			remarks: mergedRemarks,
		},
		select: {
			id: true,
			admissionId: true,
			schoolId: true,
			amount: true,
			paymentMethod: true,
			status: true,
			transactionId: true,
			paidAt: true,
			receivedBy: true,
			remarks: true,
			updatedAt: true,
		},
	});

	return {
		...payment,
		amount: Number(payment.amount),
	};
};

/**
 * Reject Online Admission Payment (Admin / Manager)
 */
export const rejectOnlineAdmissionPayment = async (
	schoolId: number,
	admissionId: number,
	userId: number,
	input: { remarks: string },
) => {
	const admission = await prisma.admission.findFirst({
		where: { id: admissionId, schoolId },
		include: { payment: true },
	});

	if (!admission) {
		throw new AppError(404, "Admission not found");
	}

	if (admission.status !== "PENDING") {
		throw new AppError(
			400,
			"Only pending admissions can have payments rejected",
		);
	}

	if (!admission.payment) {
		throw new AppError(404, "Admission payment not found");
	}

	if (admission.payment.paymentMethod === "CASH") {
		throw new AppError(400, "This admission is using cash payment");
	}

	if (admission.payment.status === "PAID") {
		throw new AppError(400, "Verified payment cannot be rejected");
	}

	const prevTrx = admission.payment.transactionId;
	const reasonNote = prevTrx
		? `Rejected: ${input.remarks.trim()} (prev TrxID: ${prevTrx})`
		: `Rejected: ${input.remarks.trim()}`;

	const payment = await prisma.admissionPayment.update({
		where: { id: admission.payment.id },
		data: {
			status: "FAILED",
			transactionId: null,
			receivedBy: userId,
			remarks: reasonNote,
		},
		select: {
			id: true,
			admissionId: true,
			schoolId: true,
			amount: true,
			paymentMethod: true,
			status: true,
			transactionId: true,
			paidAt: true,
			receivedBy: true,
			remarks: true,
			updatedAt: true,
		},
	});

	return {
		...payment,
		amount: Number(payment.amount),
	};
};
