import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreateEnrollmentInput,
	EnrollmentFilterQuery,
	UpdateEnrollmentInput,
} from "./interface.js";

const enrollmentInclude = {
	student: {
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
		},
	},
	class: { select: { id: true, name: true, code: true } },
	section: { select: { id: true, name: true } },
};

export const createEnrollment = async (
	schoolId: number,
	payload: CreateEnrollmentInput,
) => {
	const [student, schoolClass] = await Promise.all([
		prisma.student.findFirst({ where: { id: payload.studentId, schoolId } }),
		prisma.schoolClass.findFirst({ where: { id: payload.classId, schoolId } }),
	]);

	if (!student) throw new AppError(404, "Student not found in this school");
	if (!schoolClass) throw new AppError(404, "Class not found in this school");

	if (payload.sectionId !== undefined) {
		const section = await prisma.section.findFirst({
			where: { id: payload.sectionId, schoolId, classId: payload.classId },
		});
		if (!section) {
			throw new AppError(404, "Section not found for the specified class");
		}
	}

	const existingStudentYear = await prisma.enrollment.findFirst({
		where: {
			studentId: payload.studentId,
			academicYear: payload.academicYear,
		},
	});

	if (existingStudentYear) {
		throw new AppError(
			409,
			"Student is already enrolled for this academic year",
		);
	}

	if (payload.sectionId !== undefined && payload.rollNumber !== undefined) {
		const duplicateRoll = await prisma.enrollment.findFirst({
			where: {
				sectionId: payload.sectionId,
				rollNumber: payload.rollNumber,
				academicYear: payload.academicYear,
			},
		});
		if (duplicateRoll) {
			throw new AppError(
				409,
				"Roll number already exists in this section for this academic year",
			);
		}
	}

	return prisma.enrollment.create({
		data: {
			schoolId,
			studentId: payload.studentId,
			classId: payload.classId,
			academicYear: payload.academicYear,
			...(payload.sectionId !== undefined
				? { sectionId: payload.sectionId }
				: {}),
			...(payload.rollNumber !== undefined
				? { rollNumber: payload.rollNumber }
				: {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
		},
		include: enrollmentInclude,
	});
};

export const getEnrollments = async (
	schoolId: number,
	query: EnrollmentFilterQuery,
) => {
	return prisma.enrollment.findMany({
		where: {
			schoolId,
			...(query.studentId !== undefined ? { studentId: query.studentId } : {}),
			...(query.classId !== undefined ? { classId: query.classId } : {}),
			...(query.sectionId !== undefined ? { sectionId: query.sectionId } : {}),
			...(query.academicYear !== undefined
				? { academicYear: query.academicYear }
				: {}),
			...(query.status !== undefined ? { status: query.status } : {}),
		},
		include: enrollmentInclude,
		orderBy: { createdAt: "desc" },
	});
};

export const getEnrollmentById = async (schoolId: number, id: number) => {
	const enrollment = await prisma.enrollment.findFirst({
		where: { id, schoolId },
		include: enrollmentInclude,
	});

	if (!enrollment) {
		throw new AppError(404, "Enrollment not found");
	}

	return enrollment;
};

export const updateEnrollment = async (
	schoolId: number,
	id: number,
	payload: UpdateEnrollmentInput,
) => {
	const existing = await prisma.enrollment.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Enrollment not found");
	}

	const nextClassId = payload.classId ?? existing.classId;
	const nextSectionId =
		payload.sectionId !== undefined ? payload.sectionId : existing.sectionId;
	const nextRollNumber =
		payload.rollNumber !== undefined ? payload.rollNumber : existing.rollNumber;
	const nextAcademicYear = payload.academicYear ?? existing.academicYear;

	if (payload.classId !== undefined) {
		const schoolClass = await prisma.schoolClass.findFirst({
			where: { id: nextClassId, schoolId },
		});
		if (!schoolClass) throw new AppError(404, "Class not found in this school");
	}

	if (nextSectionId !== null) {
		const section = await prisma.section.findFirst({
			where: { id: nextSectionId, schoolId, classId: nextClassId },
		});
		if (!section) {
			throw new AppError(404, "Section not found for the specified class");
		}
	}

	if (nextAcademicYear !== existing.academicYear) {
		const duplicateYear = await prisma.enrollment.findFirst({
			where: {
				studentId: existing.studentId,
				academicYear: nextAcademicYear,
				id: { not: id },
			},
		});
		if (duplicateYear) {
			throw new AppError(
				409,
				"Student is already enrolled for this academic year",
			);
		}
	}

	if (nextSectionId !== null && nextRollNumber !== null) {
		const duplicateRoll = await prisma.enrollment.findFirst({
			where: {
				sectionId: nextSectionId,
				rollNumber: nextRollNumber,
				academicYear: nextAcademicYear,
				id: { not: id },
			},
		});
		if (duplicateRoll) {
			throw new AppError(
				409,
				"Roll number already exists in this section for this academic year",
			);
		}
	}

	return prisma.enrollment.update({
		where: { id },
		data: {
			...(payload.classId !== undefined ? { classId: payload.classId } : {}),
			...(payload.sectionId !== undefined
				? { sectionId: payload.sectionId }
				: {}),
			...(payload.academicYear !== undefined
				? { academicYear: payload.academicYear }
				: {}),
			...(payload.rollNumber !== undefined
				? { rollNumber: payload.rollNumber }
				: {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
		},
		include: enrollmentInclude,
	});
};

export const deleteEnrollment = async (schoolId: number, id: number) => {
	const existing = await prisma.enrollment.findFirst({
		where: { id, schoolId },
		include: {
			_count: {
				select: { attendances: true, results: true, fees: true },
			},
		},
	});

	if (!existing) {
		throw new AppError(404, "Enrollment not found");
	}

	if (
		existing._count.attendances > 0 ||
		existing._count.results > 0 ||
		existing._count.fees > 0
	) {
		throw new AppError(
			400,
			"Cannot delete enrollment with existing attendance, results, or fee records",
		);
	}

	return prisma.enrollment.delete({ where: { id } });
};
