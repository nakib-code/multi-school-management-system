import {
	type AcademicGroup,
	type DiscountMode,
	type HefzWing,
	Prisma,
	type ResidentialType,
	type StudentConcessionType,
	type UserRole,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { resolveScopedTeacherId } from "../../utils/ownershipScope.js";
import { hashPassword } from "../../utils/password.js";
import {
	generateTemporaryPassword,
	getPhoneLookupVariants,
	normalizePhone,
} from "../../utils/phone.js";

export interface CreateStudentInput {
	// Stage 1 — Required
	studentName?: string;
	firstName?: string;
	lastName?: string;
	dateOfBirth: Date;
	gender: string;
	residentialType?: ResidentialType;
	academicYear: string;
	classId: number;
	sectionId?: number;
	rollNumber?: number;
	shift?: string;
	academicGroup?: AcademicGroup;
	quranWing?: HefzWing;
	ustadId?: number;
	phone?: string;
	studentId?: string;

	// Guardian Onboarding
	guardianName: string;
	guardianPhone: string;
	guardianRelation?: string;
	guardianEmail?: string;
	guardianNid?: string;
	guardianOccupation?: string;
	guardianAddress?: string;
	guardianPassword?: string;

	// Stage 2 — Optional
	nameBangla?: string;
	birthRegNo?: string;
	bloodGroup?: string;
	religion?: string;
	nationality?: string;
	studentPhotoUrl?: string;
	fatherName?: string;
	fatherPhone?: string;
	fatherOccupation?: string;
	fatherNid?: string;
	motherName?: string;
	motherPhone?: string;
	motherOccupation?: string;
	motherNid?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	address?: string;
	presentAddress?: string;
	permanentAddress?: string;
	authorizedPickupName?: string;
	authorizedPickupRelation?: string;
	authorizedPickupPhone?: string;
	authorizedPickupNid?: string;
	pickupPersonPhotoUrl?: string;
	boardName?: string;
	boardRollNo?: string;
	boardRegNo?: string;
	fourthSubject?: string;
	previousSchool?: string;
	previousClass?: string;
	tcNumber?: string;
	tcDate?: Date;
	allergies?: string;
	medicalConditions?: string;
	medications?: string;
	healthNotes?: string;
	birthCertificateUrl?: string;
	guardianNidUrl?: string;
	previousTcUrl?: string;
	marksheetUrl?: string;
	concessionType?: StudentConcessionType;
	concessionMode?: DiscountMode;
	concessionValue?: number;
	concessionReason?: string;
}

export type UpdateStudentInput = Partial<{
	firstName: string;
	lastName: string | null;
	nameBangla: string | null;
	dateOfBirth: Date | null;
	gender: string | null;
	phone: string | null;
	residentialType: ResidentialType;
	shift: string | null;
	quranWing: HefzWing | null;
	birthRegNo: string | null;
	bloodGroup: string | null;
	religion: string | null;
	nationality: string | null;
	studentPhotoUrl: string | null;
	fatherName: string | null;
	fatherPhone: string | null;
	fatherOccupation: string | null;
	fatherNid: string | null;
	motherName: string | null;
	motherPhone: string | null;
	motherOccupation: string | null;
	motherNid: string | null;
	emergencyContactName: string | null;
	emergencyContactPhone: string | null;
	address: string | null;
	presentAddress: string | null;
	permanentAddress: string | null;
	authorizedPickupName: string | null;
	authorizedPickupRelation: string | null;
	authorizedPickupPhone: string | null;
	authorizedPickupNid: string | null;
	pickupPersonPhotoUrl: string | null;
	academicGroup: AcademicGroup | null;
	boardName: string | null;
	boardRollNo: string | null;
	boardRegNo: string | null;
	fourthSubject: string | null;
	previousSchool: string | null;
	previousClass: string | null;
	tcNumber: string | null;
	tcDate: Date | null;
	allergies: string | null;
	medicalConditions: string | null;
	medications: string | null;
	healthNotes: string | null;
	birthCertificateUrl: string | null;
	guardianNidUrl: string | null;
	previousTcUrl: string | null;
	marksheetUrl: string | null;
	concessionType: StudentConcessionType | null;
	concessionMode: DiscountMode | null;
	concessionValue: number | null;
	concessionReason: string | null;
}>;

const generateStudentCode = (schoolId: number) => {
	const rand = Math.floor(1000 + Math.random() * 9000);
	const ts = Date.now().toString().slice(-5);
	return `STD-${schoolId}-${ts}${rand}`;
};

const fullStudentInclude = {
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
	guardians: {
		select: {
			isPrimary: true,
			guardian: {
				select: {
					id: true,
					relation: true,
					occupation: true,
					address: true,
					nid: true,
					user: {
						select: {
							id: true,
							name: true,
							phone: true,
							email: true,
						},
					},
				},
			},
		},
	},
	enrollments: {
		orderBy: { createdAt: "desc" as const },
		select: {
			id: true,
			academicYear: true,
			rollNumber: true,
			shift: true,
			academicGroup: true,
			boardName: true,
			boardRollNo: true,
			boardRegNo: true,
			fourthSubject: true,
			status: true,
			enrolledAt: true,
			class: { select: { id: true, name: true, code: true } },
			section: { select: { id: true, name: true, code: true } },
		},
	},
	hefzEnrollments: {
		orderBy: { createdAt: "desc" as const },
		select: {
			id: true,
			wing: true,
			currentPara: true,
			currentSurah: true,
			startDate: true,
			status: true,
			ustad: {
				select: {
					id: true,
					employeeId: true,
					firstName: true,
					lastName: true,
				},
			},
		},
	},
};

export const createStudent = async (
	schoolId: number,
	input: CreateStudentInput,
	requester?: { userId: number; role: UserRole },
) => {
	const hasNonDefaultConcession =
		input.concessionType !== undefined ||
		(input.concessionMode !== undefined &&
			input.concessionMode !== "PERCENTAGE") ||
		(input.concessionValue !== undefined &&
			Number(input.concessionValue) !== 0) ||
		(input.concessionReason !== undefined &&
			input.concessionReason.trim() !== "");

	if (hasNonDefaultConcession && requester && requester.role !== "ADMIN") {
		throw new AppError(
			403,
			"Only School Admins can assign student fee concessions",
		);
	}

	const canAssignConcession = !requester || requester.role === "ADMIN";

	const [school, schoolClass] = await Promise.all([
		prisma.school.findUnique({
			where: { id: schoolId },
			select: { id: true, status: true },
		}),
		prisma.schoolClass.findFirst({
			where: { id: input.classId, schoolId, isActive: true },
			select: { id: true, name: true, code: true },
		}),
	]);

	if (!school) {
		throw new AppError(404, "School not found");
	}
	if (school.status !== "ACTIVE") {
		throw new AppError(403, "School is not active");
	}
	if (!schoolClass) {
		throw new AppError(404, "Selected class not found or inactive");
	}

	if (input.sectionId !== undefined) {
		const section = await prisma.section.findFirst({
			where: { id: input.sectionId, schoolId, classId: input.classId },
			select: { id: true },
		});
		if (!section) {
			throw new AppError(404, "Selected section not found for this class");
		}
	}

	// Derive firstName / lastName from studentName or firstName
	let firstName = input.firstName?.trim() || "";
	let lastName = input.lastName?.trim() || undefined;
	if (!firstName && input.studentName?.trim()) {
		const parts = input.studentName.trim().split(/\s+/);
		firstName = parts[0] ?? input.studentName.trim();
		if (parts.length > 1) {
			lastName = parts.slice(1).join(" ");
		}
	}

	const generatedCode =
		input.studentId?.trim() || generateStudentCode(schoolId);
	const cleanPhone = normalizePhone(input.guardianPhone);
	const phoneVariants = getPhoneLookupVariants(input.guardianPhone);
	const relUpper = (input.guardianRelation?.trim() || "FATHER").toUpperCase();

	return prisma.$transaction(
		async (tx) => {
			// Enforce active subscription & package student limit atomically inside transaction
			const now = new Date();
			const activeSubscription = await tx.schoolSubscription.findFirst({
				where: {
					schoolId,
					status: "ACTIVE",
					startDate: { lte: now },
					endDate: { gte: now },
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

			// 1. Create Student WITHOUT requiring student email or User login
			const student = await tx.student.create({
				data: {
					schoolId,
					studentId: generatedCode,
					firstName,
					...(lastName ? { lastName } : {}),
					...(input.nameBangla ? { nameBangla: input.nameBangla } : {}),
					dateOfBirth: input.dateOfBirth,
					gender: input.gender.trim().toUpperCase(),
					phone: input.phone?.trim() || cleanPhone,
					residentialType: input.residentialType ?? "NON_RESIDENTIAL",
					shift: (input.shift?.trim() || "MORNING").toUpperCase(),
					...(input.academicGroup
						? { academicGroup: input.academicGroup }
						: {}),
					...(input.quranWing ? { quranWing: input.quranWing } : {}),
					...(input.birthRegNo ? { birthRegNo: input.birthRegNo } : {}),
					...(input.bloodGroup ? { bloodGroup: input.bloodGroup } : {}),
					...(input.religion ? { religion: input.religion } : {}),
					...(input.nationality ? { nationality: input.nationality } : {}),
					...(input.studentPhotoUrl
						? { studentPhotoUrl: input.studentPhotoUrl }
						: {}),
					...(input.fatherName || relUpper === "FATHER"
						? { fatherName: input.fatherName ?? input.guardianName.trim() }
						: {}),
					...(input.fatherPhone || relUpper === "FATHER"
						? { fatherPhone: input.fatherPhone ?? cleanPhone }
						: {}),
					...(input.fatherOccupation ||
					(relUpper === "FATHER" && input.guardianOccupation)
						? {
								fatherOccupation:
									input.fatherOccupation ?? input.guardianOccupation,
							}
						: {}),
					...(input.fatherNid || (relUpper === "FATHER" && input.guardianNid)
						? { fatherNid: input.fatherNid ?? input.guardianNid }
						: {}),
					...(input.motherName || relUpper === "MOTHER"
						? { motherName: input.motherName ?? input.guardianName.trim() }
						: {}),
					...(input.motherPhone || relUpper === "MOTHER"
						? { motherPhone: input.motherPhone ?? cleanPhone }
						: {}),
					...(input.motherOccupation ||
					(relUpper === "MOTHER" && input.guardianOccupation)
						? {
								motherOccupation:
									input.motherOccupation ?? input.guardianOccupation,
							}
						: {}),
					...(input.motherNid || (relUpper === "MOTHER" && input.guardianNid)
						? { motherNid: input.motherNid ?? input.guardianNid }
						: {}),
					...(input.emergencyContactName
						? { emergencyContactName: input.emergencyContactName }
						: {}),
					...(input.emergencyContactPhone
						? { emergencyContactPhone: input.emergencyContactPhone }
						: {}),
					...(input.presentAddress || input.address
						? {
								address: input.presentAddress ?? input.address,
								presentAddress: input.presentAddress ?? input.address,
							}
						: {}),
					...(input.permanentAddress
						? { permanentAddress: input.permanentAddress }
						: {}),
					...(input.authorizedPickupName
						? { authorizedPickupName: input.authorizedPickupName }
						: {}),
					...(input.authorizedPickupRelation
						? { authorizedPickupRelation: input.authorizedPickupRelation }
						: {}),
					...(input.authorizedPickupPhone
						? { authorizedPickupPhone: input.authorizedPickupPhone }
						: {}),
					...(input.authorizedPickupNid
						? { authorizedPickupNid: input.authorizedPickupNid }
						: {}),
					...(input.pickupPersonPhotoUrl
						? { pickupPersonPhotoUrl: input.pickupPersonPhotoUrl }
						: {}),
					...(input.boardName ? { boardName: input.boardName } : {}),
					...(input.boardRollNo ? { boardRollNo: input.boardRollNo } : {}),
					...(input.boardRegNo ? { boardRegNo: input.boardRegNo } : {}),
					...(input.fourthSubject
						? { fourthSubject: input.fourthSubject }
						: {}),
					...(input.previousSchool
						? { previousSchool: input.previousSchool }
						: {}),
					...(input.previousClass
						? { previousClass: input.previousClass }
						: {}),
					...(input.tcNumber ? { tcNumber: input.tcNumber } : {}),
					...(input.tcDate ? { tcDate: input.tcDate } : {}),
					...(input.allergies ? { allergies: input.allergies } : {}),
					...(input.medicalConditions
						? { medicalConditions: input.medicalConditions }
						: {}),
					...(input.medications ? { medications: input.medications } : {}),
					...(input.healthNotes ? { healthNotes: input.healthNotes } : {}),
					...(input.birthCertificateUrl
						? { birthCertificateUrl: input.birthCertificateUrl }
						: {}),
					...(input.guardianNidUrl
						? { guardianNidUrl: input.guardianNidUrl }
						: {}),
					...(input.previousTcUrl
						? { previousTcUrl: input.previousTcUrl }
						: {}),
					...(input.marksheetUrl ? { marksheetUrl: input.marksheetUrl } : {}),
					...(canAssignConcession && input.concessionType
						? { concessionType: input.concessionType }
						: {}),
					...(canAssignConcession && input.concessionMode
						? { concessionMode: input.concessionMode }
						: {}),
					...(canAssignConcession && input.concessionValue !== undefined
						? { concessionValue: input.concessionValue }
						: {}),
					...(canAssignConcession && input.concessionReason
						? { concessionReason: input.concessionReason }
						: {}),
					isActive: true,
				},
			});

			// 2. Atomically Assign Next Roll Number (when omitted) & Create Academic Enrollment
			let resolvedRollNumber = input.rollNumber;
			if (resolvedRollNumber === undefined) {
				const maxRollAgg = await tx.enrollment.aggregate({
					where: {
						schoolId,
						academicYear: input.academicYear.trim(),
						...(input.sectionId !== undefined
							? { sectionId: input.sectionId }
							: { classId: input.classId, sectionId: null }),
					},
					_max: { rollNumber: true },
				});
				resolvedRollNumber = (maxRollAgg._max.rollNumber ?? 0) + 1;
			}

			const enrollment = await tx.enrollment.create({
				data: {
					schoolId,
					studentId: student.id,
					classId: input.classId,
					...(input.sectionId !== undefined
						? { sectionId: input.sectionId }
						: {}),
					academicYear: input.academicYear.trim(),
					rollNumber: resolvedRollNumber,
					shift: (input.shift?.trim() || "MORNING").toUpperCase(),
					...(input.academicGroup
						? { academicGroup: input.academicGroup }
						: {}),
					...(input.boardName ? { boardName: input.boardName } : {}),
					...(input.boardRollNo ? { boardRollNo: input.boardRollNo } : {}),
					...(input.boardRegNo ? { boardRegNo: input.boardRegNo } : {}),
					...(input.fourthSubject
						? { fourthSubject: input.fourthSubject }
						: {}),
					status: "ACTIVE",
				},
				include: {
					class: { select: { id: true, name: true, code: true } },
					section: { select: { id: true, name: true, code: true } },
				},
			});

			// 3. Guardian-Centric Onboarding by (schoolId, guardianPhone)
			let guardianSummary: {
				guardianId: number;
				name: string;
				phone: string;
				email: string;
				isExistingGuardian: boolean;
				defaultPassword?: string;
				temporaryPassword?: string;
			} | null = null;

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

				if (input.guardianNid && !existingGuardian.nid) {
					await tx.guardian.update({
						where: { id: existingGuardian.id },
						data: { nid: input.guardianNid.trim() },
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
				const defaultPassword =
					input.guardianPassword?.trim() || generateTemporaryPassword();
				const passwordHash = await hashPassword(defaultPassword);

				let guardianEmail =
					input.guardianEmail?.trim().toLowerCase() ||
					`guardian.${schoolId}.${digits || Date.now()}@madrasaos.local`;

				const existingEmailUser = await tx.user.findUnique({
					where: { email: guardianEmail },
					select: { id: true },
				});
				if (existingEmailUser) {
					guardianEmail = `guardian.${schoolId}.${digits || Date.now()}.${Math.floor(100 + Math.random() * 900)}@madrasaos.local`;
				}

				const guardianUser = await tx.user.create({
					data: {
						name: input.guardianName.trim(),
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
						relation: relUpper,
						...(input.guardianOccupation
							? { occupation: input.guardianOccupation.trim() }
							: {}),
						...(input.guardianAddress || input.presentAddress
							? {
									address: (
										input.guardianAddress ??
										input.presentAddress ??
										""
									).trim(),
								}
							: {}),
						...(input.guardianNid ? { nid: input.guardianNid.trim() } : {}),
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
					temporaryPassword: defaultPassword,
				};
			}

			// 4. Optional Initial Hefz Enrollment if quranWing + ustadId provided
			let hefzEnrollment = null;
			if (input.quranWing && input.ustadId) {
				const ustad = await tx.teacher.findFirst({
					where: { id: input.ustadId, schoolId },
					select: { id: true },
				});
				if (ustad) {
					hefzEnrollment = await tx.hefzEnrollment.create({
						data: {
							schoolId,
							studentId: student.id,
							ustadId: ustad.id,
							wing: input.quranWing,
							status: "ACTIVE",
						},
					});
				}
			}

			return {
				student,
				enrollment,
				guardian: guardianSummary,
				hefzEnrollment,
			};
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		},
	);
};

export const getMyStudentProfile = async (userId: number, schoolId: number) => {
	const student = await prisma.student.findFirst({
		where: { userId, schoolId, isActive: true },
		include: fullStudentInclude,
	});

	if (!student) {
		throw new AppError(404, "Student profile not found");
	}

	return student;
};

const buildTeacherStudentScopeWhere = async (
	schoolId: number,
	requester: { userId: number; role: UserRole },
): Promise<Prisma.StudentWhereInput | null> => {
	const teacherId = await resolveScopedTeacherId(schoolId, requester);
	if (!teacherId || teacherId < 0) return null;

	const assignments = await prisma.teacherAssignment.findMany({
		where: { schoolId, teacherId, isActive: true },
		select: { classId: true, sectionId: true },
	});

	const orConditions: Prisma.StudentWhereInput[] = [
		{
			hefzEnrollments: {
				some: { schoolId, ustadId: teacherId, status: "ACTIVE" },
			},
		},
	];

	if (assignments.length > 0) {
		orConditions.push({
			enrollments: {
				some: {
					schoolId,
					status: "ACTIVE",
					OR: assignments.map((a) => ({
						classId: a.classId,
						OR: [{ sectionId: a.sectionId }, { sectionId: null }],
					})),
				},
			},
		});
	}

	return { OR: orConditions };
};

export const getAllStudents = async (
	schoolId: number,
	page: number,
	limit: number,
	search?: string,
	requester?: { userId: number; role: UserRole },
) => {
	const skip = (page - 1) * limit;

	const andConditions: Prisma.StudentWhereInput[] = [
		{ schoolId, isActive: true },
	];

	if (requester?.role === "TEACHER") {
		const teacherScope = await buildTeacherStudentScopeWhere(
			schoolId,
			requester,
		);
		if (!teacherScope) {
			return {
				students: [],
				pagination: { page, limit, total: 0, totalPages: 0 },
			};
		}
		andConditions.push(teacherScope);
	}

	if (search) {
		andConditions.push({
			OR: [
				{ firstName: { contains: search, mode: "insensitive" } },
				{ lastName: { contains: search, mode: "insensitive" } },
				{ nameBangla: { contains: search, mode: "insensitive" } },
				{ studentId: { contains: search, mode: "insensitive" } },
				{ phone: { contains: search, mode: "insensitive" } },
				{
					user: {
						email: { contains: search, mode: "insensitive" },
					},
				},
			],
		});
	}

	const where: Prisma.StudentWhereInput = { AND: andConditions };

	const [students, total] = await Promise.all([
		prisma.student.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				studentId: true,
				firstName: true,
				lastName: true,
				nameBangla: true,
				dateOfBirth: true,
				gender: true,
				phone: true,
				address: true,
				residentialType: true,
				shift: true,
				academicGroup: true,
				quranWing: true,
				studentPhotoUrl: true,
				admissionDate: true,
				concessionType: true,
				concessionMode: true,
				concessionValue: true,
				concessionReason: true,
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
				enrollments: {
					where: { status: "ACTIVE" },
					orderBy: { createdAt: "desc" },
					take: 1,
					select: {
						id: true,
						academicYear: true,
						rollNumber: true,
						academicGroup: true,
						class: { select: { id: true, name: true, code: true } },
						section: { select: { id: true, name: true, code: true } },
					},
				},
				guardians: {
					select: {
						isPrimary: true,
						guardian: {
							select: {
								id: true,
								relation: true,
								nid: true,
								user: {
									select: { name: true, phone: true, email: true },
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

const assertGuardianOwnsStudent = async (
	schoolId: number,
	userId: number,
	studentId: number,
) => {
	const guardian = await prisma.guardian.findFirst({
		where: { userId, schoolId },
		select: { id: true },
	});
	if (!guardian) {
		throw new AppError(403, "Guardian profile not found in this school");
	}
	const link = await prisma.guardianStudent.findUnique({
		where: {
			guardianId_studentId: { guardianId: guardian.id, studentId },
		},
	});
	if (!link) {
		throw new AppError(403, "You are not authorized to access this student");
	}
};

export const getStudentById = async (
	schoolId: number,
	studentId: number,
	requester?: { userId: number; role: UserRole },
) => {
	if (requester?.role === "GUARDIAN") {
		await assertGuardianOwnsStudent(schoolId, requester.userId, studentId);
	} else if (requester?.role === "TEACHER") {
		const teacherScope = await buildTeacherStudentScopeWhere(
			schoolId,
			requester,
		);
		if (!teacherScope) {
			throw new AppError(403, "You are not authorized to access this student");
		}
		const allowed = await prisma.student.findFirst({
			where: { AND: [{ id: studentId, schoolId }, teacherScope] },
			select: { id: true },
		});
		if (!allowed) {
			throw new AppError(
				403,
				"You can only view students in your assigned classes or Hefz groups",
			);
		}
	}

	const student = await prisma.student.findFirst({
		where: { id: studentId, schoolId },
		include: fullStudentInclude,
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	return student;
};

export const updateStudent = async (
	schoolId: number,
	studentId: number,
	data: UpdateStudentInput,
	requester?: { userId: number; role: UserRole },
) => {
	const hasConcessionMutation =
		data.concessionType !== undefined ||
		data.concessionMode !== undefined ||
		data.concessionValue !== undefined ||
		data.concessionReason !== undefined;

	if (hasConcessionMutation && requester && requester.role !== "ADMIN") {
		throw new AppError(
			403,
			"Only School Admins can modify student fee concessions",
		);
	}

	if (requester?.role === "GUARDIAN") {
		await assertGuardianOwnsStudent(schoolId, requester.userId, studentId);
	}

	const student = await prisma.student.findFirst({
		where: { id: studentId, schoolId },
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	const {
		concessionType: _concessionType,
		concessionMode: _concessionMode,
		concessionValue: _concessionValue,
		concessionReason: _concessionReason,
		...nonConcessionData
	} = data;

	const safeUpdateData: UpdateStudentInput =
		!requester || requester.role === "ADMIN" ? data : nonConcessionData;

	return prisma.$transaction(async (tx) => {
		const updatedStudent = await tx.student.update({
			where: { id: student.id },
			data: {
				...safeUpdateData,
				...(safeUpdateData.presentAddress !== undefined &&
				safeUpdateData.address === undefined
					? { address: safeUpdateData.presentAddress }
					: {}),
			},
			include: fullStudentInclude,
		});

		// Sync academic/board fields to latest active Enrollment if provided
		const hasEnrollmentUpdates =
			data.academicGroup !== undefined ||
			data.shift !== undefined ||
			data.boardName !== undefined ||
			data.boardRollNo !== undefined ||
			data.boardRegNo !== undefined ||
			data.fourthSubject !== undefined;

		if (hasEnrollmentUpdates) {
			const latestEnrollment = await tx.enrollment.findFirst({
				where: { studentId: student.id, schoolId, status: "ACTIVE" },
				orderBy: { createdAt: "desc" },
				select: { id: true },
			});
			if (latestEnrollment) {
				await tx.enrollment.update({
					where: { id: latestEnrollment.id },
					data: {
						...(data.academicGroup !== undefined
							? { academicGroup: data.academicGroup }
							: {}),
						...(data.shift !== undefined ? { shift: data.shift } : {}),
						...(data.boardName !== undefined
							? { boardName: data.boardName }
							: {}),
						...(data.boardRollNo !== undefined
							? { boardRollNo: data.boardRollNo }
							: {}),
						...(data.boardRegNo !== undefined
							? { boardRegNo: data.boardRegNo }
							: {}),
						...(data.fourthSubject !== undefined
							? { fourthSubject: data.fourthSubject }
							: {}),
					},
				});
			}
		}

		return updatedStudent;
	});
};

export const deactivateStudent = async (
	schoolId: number,
	studentId: number,
) => {
	const student = await prisma.student.findFirst({
		where: { id: studentId, schoolId },
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	if (!student.isActive) {
		throw new AppError(400, "Student is already inactive");
	}

	return prisma.$transaction(async (tx) => {
		const updatedStudent = await tx.student.update({
			where: { id: student.id },
			data: { isActive: false },
		});

		if (student.userId !== null) {
			await tx.user.update({
				where: { id: student.userId },
				data: { status: "INACTIVE" },
			});
		}

		return updatedStudent;
	});
};

export const activateStudent = async (schoolId: number, studentId: number) => {
	const student = await prisma.student.findFirst({
		where: { id: studentId, schoolId },
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}

	if (student.isActive) {
		throw new AppError(400, "Student is already active");
	}

	return prisma.$transaction(async (tx) => {
		const updatedStudent = await tx.student.update({
			where: { id: student.id },
			data: { isActive: true },
		});

		if (student.userId !== null) {
			await tx.user.update({
				where: { id: student.userId },
				data: { status: "ACTIVE" },
			});
		}

		return updatedStudent;
	});
};

export const resetStudentPassword = async (
	schoolId: number,
	studentId: number,
	newPassword?: string,
) => {
	const student = await prisma.student.findFirst({
		where: { id: studentId, schoolId },
		include: {
			user: { select: { id: true, name: true, email: true, phone: true } },
		},
	});

	if (!student) {
		throw new AppError(404, "Student not found");
	}
	if (!student.user) {
		throw new AppError(
			400,
			"This student does not have a portal login account",
		);
	}

	const rawPassword = newPassword?.trim() || generateTemporaryPassword();
	if (rawPassword.length < 6) {
		throw new AppError(400, "Password must be at least 6 characters");
	}

	const passwordHash = await hashPassword(rawPassword);
	const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

	await prisma.user.update({
		where: { id: student.user.id },
		data: {
			passwordHash,
			passwordChangedAt: changedAt,
			mustChangePassword: true,
		},
	});

	return {
		studentId: student.id,
		studentCode: student.studentId,
		name: student.user.name,
		email: student.user.email,
		phone: student.user.phone,
		temporaryPassword: rawPassword,
	};
};
