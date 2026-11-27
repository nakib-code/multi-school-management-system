import type { FeeType } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";

import type {
	ClassFeeStructureFilterQuery,
	CreateClassInput,
	UpdateClassInput,
	UpsertClassFeeStructuresInput,
} from "./interface.js";

// ============================================
// Helpers
// ============================================

const ensureSchoolExists = async (schoolId: number) => {
	const school = await prisma.school.findUnique({
		where: {
			id: schoolId,
		},
		select: {
			id: true,
			status: true,
		},
	});

	if (!school) {
		throw new AppError(404, "School not found");
	}

	return school;
};

const ensureClassExists = async (schoolId: number, classId: number) => {
	const schoolClass = await prisma.schoolClass.findFirst({
		where: {
			id: classId,
			schoolId,
		},
	});

	if (!schoolClass) {
		throw new AppError(404, "Class not found");
	}

	return schoolClass;
};

// ============================================
// Create Class
// ============================================

export const createClass = async (
	schoolId: number,
	payload: Omit<CreateClassInput, "schoolId">,
) => {
	await ensureSchoolExists(schoolId);

	const code = payload.code.trim();

	const existingClass = await prisma.schoolClass.findUnique({
		where: {
			schoolId_code: {
				schoolId,
				code,
			},
		},
	});

	if (existingClass) {
		throw new AppError(409, "A class with this code already exists");
	}

	return prisma.schoolClass.create({
		data: {
			schoolId,
			name: payload.name.trim(),
			code,
			description: payload.description?.trim() || null,
		},
	});
};

// ============================================
// Get All Classes
// ============================================

export const getClasses = async (schoolId: number) => {
	await ensureSchoolExists(schoolId);

	return prisma.schoolClass.findMany({
		where: {
			schoolId,
		},

		include: {
			_count: {
				select: {
					sections: true,
					teacherAssignments: true,
					enrollments: true,
					exams: true,
					admissions: true,
				},
			},
		},

		orderBy: [
			{
				name: "asc",
			},
			{
				id: "asc",
			},
		],
	});
};

// ============================================
// Class Fee Structure Helpers & APIs
// ============================================

const pickBestFeeStructure = (
	structures: Array<{
		id: number;
		feeType: FeeType;
		title: string | null;
		amount: unknown;
		academicYear: string | null;
	}>,
	feeType: FeeType,
	academicYear?: string | null,
) => {
	const matching = structures.filter((s) => s.feeType === feeType);
	if (academicYear) {
		const exact = matching.find((s) => s.academicYear === academicYear);
		if (exact) return exact;
	}
	return matching.find((s) => s.academicYear === null) ?? matching[0] ?? null;
};

export const resolveClassFeeAmount = async (
	schoolId: number,
	classId: number,
	feeType: FeeType,
	academicYear?: string | null,
): Promise<{
	amount: number | null;
	title: string | null;
	source: "CLASS_YEAR" | "CLASS_DEFAULT" | "SCHOOL_DEFAULT" | "NONE";
}> => {
	const structures = await prisma.classFeeStructure.findMany({
		where: {
			schoolId,
			classId,
			feeType,
			isActive: true,
		},
		select: {
			id: true,
			feeType: true,
			title: true,
			amount: true,
			academicYear: true,
		},
	});

	if (academicYear) {
		const exact = structures.find((s) => s.academicYear === academicYear);
		if (exact) {
			return {
				amount: Number(exact.amount),
				title: exact.title,
				source: "CLASS_YEAR",
			};
		}
	}

	const defaultRow = structures.find((s) => s.academicYear === null);
	if (defaultRow) {
		return {
			amount: Number(defaultRow.amount),
			title: defaultRow.title,
			source: "CLASS_DEFAULT",
		};
	}

	if (feeType === "ADMISSION") {
		const setting = await prisma.schoolSetting.findUnique({
			where: { schoolId },
			select: { admissionFee: true },
		});
		const fallback = setting ? Number(setting.admissionFee) : 0;
		return {
			amount: Number.isFinite(fallback) ? fallback : 0,
			title: null,
			source: "SCHOOL_DEFAULT",
		};
	}

	return { amount: null, title: null, source: "NONE" };
};

export const getClassFeeStructures = async (
	schoolId: number,
	query: ClassFeeStructureFilterQuery = {},
) => {
	await ensureSchoolExists(schoolId);

	const [setting, classes] = await Promise.all([
		prisma.schoolSetting.findUnique({
			where: { schoolId },
			select: { admissionFee: true },
		}),
		prisma.schoolClass.findMany({
			where: {
				schoolId,
				...(query.classId !== undefined ? { id: query.classId } : {}),
			},
			include: {
				feeStructures: {
					where: {
						isActive: true,
						...(query.feeType !== undefined ? { feeType: query.feeType } : {}),
					},
					orderBy: [{ feeType: "asc" }, { academicYear: "desc" }],
				},
			},
			orderBy: [{ name: "asc" }, { id: "asc" }],
		}),
	]);

	const schoolDefaultAdmissionFee = setting ? Number(setting.admissionFee) : 0;
	const targetYear = query.academicYear?.trim() || null;

	const formattedClasses = classes.map((cls) => {
		const filteredStructures = cls.feeStructures.filter((s) =>
			targetYear
				? s.academicYear === targetYear || s.academicYear === null
				: true,
		);
		const admRow = pickBestFeeStructure(
			filteredStructures,
			"ADMISSION",
			targetYear,
		);
		const resolvedAdmissionFee = admRow
			? Number(admRow.amount)
			: schoolDefaultAdmissionFee;

		return {
			id: cls.id,
			name: cls.name,
			code: cls.code,
			isActive: cls.isActive,
			resolvedAdmissionFee,
			feeStructures: filteredStructures.map((s) => ({
				id: s.id,
				classId: s.classId,
				feeType: s.feeType,
				title: s.title,
				amount: Number(s.amount),
				academicYear: s.academicYear,
				isActive: s.isActive,
			})),
		};
	});

	return {
		schoolDefaultAdmissionFee,
		classes: formattedClasses,
	};
};

export const upsertClassFeeStructures = async (
	schoolId: number,
	classId: number,
	payload: UpsertClassFeeStructuresInput,
) => {
	await ensureClassExists(schoolId, classId);
	const normalizedYear = payload.academicYear?.trim() || null;

	await prisma.$transaction(async (tx) => {
		for (const item of payload.items) {
			const existing = await tx.classFeeStructure.findFirst({
				where: {
					schoolId,
					classId,
					feeType: item.feeType,
					academicYear: normalizedYear,
				},
			});

			if (item.amount === null) {
				if (existing) {
					await tx.classFeeStructure.delete({ where: { id: existing.id } });
				}
				continue;
			}

			if (existing) {
				await tx.classFeeStructure.update({
					where: { id: existing.id },
					data: {
						amount: item.amount,
						title: item.title?.trim() || null,
						isActive: item.isActive ?? true,
					},
				});
			} else {
				await tx.classFeeStructure.create({
					data: {
						schoolId,
						classId,
						feeType: item.feeType,
						amount: item.amount,
						title: item.title?.trim() || null,
						academicYear: normalizedYear,
						isActive: item.isActive ?? true,
					},
				});
			}
		}
	});

	const updated = await getClassFeeStructures(schoolId, {
		classId,
		...(normalizedYear ? { academicYear: normalizedYear } : {}),
	});

	return updated.classes[0] ?? null;
};

// ============================================
// Get Active Classes
// ============================================

export const getActiveClasses = async (schoolId: number) => {
	await ensureSchoolExists(schoolId);

	const currentYear = String(new Date().getFullYear());
	const [setting, classes] = await Promise.all([
		prisma.schoolSetting.findUnique({
			where: { schoolId },
			select: { admissionFee: true },
		}),
		prisma.schoolClass.findMany({
			where: {
				schoolId,
				isActive: true,
			},
			select: {
				id: true,
				name: true,
				code: true,
				description: true,
				feeStructures: {
					where: { isActive: true },
					select: {
						id: true,
						feeType: true,
						title: true,
						amount: true,
						academicYear: true,
					},
				},
			},
			orderBy: {
				name: "asc",
			},
		}),
	]);

	const schoolDefaultAdmissionFee = setting ? Number(setting.admissionFee) : 0;

	return classes.map((cls) => {
		const admissionRow = pickBestFeeStructure(
			cls.feeStructures,
			"ADMISSION",
			currentYear,
		);
		const monthlyRow = pickBestFeeStructure(
			cls.feeStructures,
			"MONTHLY",
			currentYear,
		);
		const examRow = pickBestFeeStructure(
			cls.feeStructures,
			"EXAM",
			currentYear,
		);
		const sessionRow = pickBestFeeStructure(
			cls.feeStructures,
			"SESSION",
			currentYear,
		);
		const transportRow = pickBestFeeStructure(
			cls.feeStructures,
			"TRANSPORT",
			currentYear,
		);
		const libraryRow = pickBestFeeStructure(
			cls.feeStructures,
			"LIBRARY",
			currentYear,
		);
		const labRow = pickBestFeeStructure(cls.feeStructures, "LAB", currentYear);
		const otherRow = pickBestFeeStructure(
			cls.feeStructures,
			"OTHER",
			currentYear,
		);

		const resolvedAdmissionFee = admissionRow
			? Number(admissionRow.amount)
			: schoolDefaultAdmissionFee;

		return {
			id: cls.id,
			name: cls.name,
			code: cls.code,
			description: cls.description,
			resolvedAdmissionFee,
			feeSummary: {
				admission: resolvedAdmissionFee,
				monthly: monthlyRow ? Number(monthlyRow.amount) : null,
				exam: examRow ? Number(examRow.amount) : null,
				session: sessionRow ? Number(sessionRow.amount) : null,
				transport: transportRow ? Number(transportRow.amount) : null,
				library: libraryRow ? Number(libraryRow.amount) : null,
				lab: labRow ? Number(labRow.amount) : null,
				other: otherRow ? Number(otherRow.amount) : null,
			},
			feeStructures: cls.feeStructures.map((s) => ({
				id: s.id,
				feeType: s.feeType,
				title: s.title,
				amount: Number(s.amount),
				academicYear: s.academicYear,
			})),
		};
	});
};

// ============================================
// Get Single Class
// ============================================

export const getClassById = async (schoolId: number, classId: number) => {
	await ensureSchoolExists(schoolId);

	const schoolClass = await prisma.schoolClass.findFirst({
		where: {
			id: classId,
			schoolId,
		},

		include: {
			sections: {
				orderBy: {
					name: "asc",
				},
			},

			_count: {
				select: {
					sections: true,
					teacherAssignments: true,
					enrollments: true,
					exams: true,
					admissions: true,
				},
			},
		},
	});

	if (!schoolClass) {
		throw new AppError(404, "Class not found");
	}

	return schoolClass;
};

// ============================================
// Update Class
// ============================================

export const updateClass = async (
	schoolId: number,
	classId: number,
	payload: UpdateClassInput,
) => {
	const existingClass = await ensureClassExists(schoolId, classId);

	if (payload.code && payload.code.trim() !== existingClass.code) {
		const duplicate = await prisma.schoolClass.findUnique({
			where: {
				schoolId_code: {
					schoolId,
					code: payload.code.trim(),
				},
			},
		});

		if (duplicate) {
			throw new AppError(409, "A class with this code already exists");
		}
	}

	return prisma.schoolClass.update({
		where: {
			id: classId,
		},

		data: {
			...(payload.name !== undefined && {
				name: payload.name.trim(),
			}),

			...(payload.code !== undefined && {
				code: payload.code.trim(),
			}),

			...(payload.description !== undefined && {
				description: payload.description.trim() || null,
			}),

			...(payload.isActive !== undefined && {
				isActive: payload.isActive,
			}),
		},
	});
};

// ============================================
// Toggle Class Status
// ============================================

export const toggleClassStatus = async (schoolId: number, classId: number) => {
	const schoolClass = await ensureClassExists(schoolId, classId);

	return prisma.schoolClass.update({
		where: {
			id: classId,
		},

		data: {
			isActive: !schoolClass.isActive,
		},
	});
};

// ============================================
// Delete Class
// ============================================

export const deleteClass = async (schoolId: number, classId: number) => {
	const schoolClass = await ensureClassExists(schoolId, classId);

	const counts = await prisma.schoolClass.findUnique({
		where: {
			id: schoolClass.id,
		},

		select: {
			_count: {
				select: {
					sections: true,
					teacherAssignments: true,
					enrollments: true,
					exams: true,
					admissions: true,
				},
			},
		},
	});

	if (!counts) {
		throw new AppError(404, "Class not found");
	}

	const hasDependencies =
		counts._count.sections > 0 ||
		counts._count.teacherAssignments > 0 ||
		counts._count.enrollments > 0 ||
		counts._count.exams > 0 ||
		counts._count.admissions > 0;

	if (hasDependencies) {
		throw new AppError(
			400,
			"This class cannot be deleted because it has related records. Deactivate it instead.",
		);
	}

	await prisma.schoolClass.delete({
		where: {
			id: classId,
		},
	});

	return {
		classId,
		deleted: true,
	};
};
