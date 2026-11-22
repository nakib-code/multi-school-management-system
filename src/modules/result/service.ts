import { Grade } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import type {
	CreateResultInput,
	ResultFilterQuery,
	UpdateResultInput,
} from "./interface.js";

const computeGrade = (
	marks: number,
	fullMarks: number,
	passMarks: number,
): { grade: Grade; gradePoint: number } => {
	if (marks < passMarks) {
		return { grade: Grade.F, gradePoint: 0.0 };
	}
	const percentage = fullMarks > 0 ? (marks / fullMarks) * 100 : 0;
	if (percentage >= 80) return { grade: Grade.A_PLUS, gradePoint: 5.0 };
	if (percentage >= 70) return { grade: Grade.A, gradePoint: 4.0 };
	if (percentage >= 60) return { grade: Grade.A_MINUS, gradePoint: 3.5 };
	if (percentage >= 50) return { grade: Grade.B, gradePoint: 3.0 };
	if (percentage >= 40) return { grade: Grade.C, gradePoint: 2.0 };
	return { grade: Grade.D, gradePoint: 1.0 };
};

const resultInclude = {
	student: {
		select: { id: true, studentId: true, firstName: true, lastName: true },
	},
	exam: {
		select: { id: true, name: true, type: true, academicYear: true },
	},
	subject: {
		select: {
			id: true,
			name: true,
			code: true,
			fullMarks: true,
			passMarks: true,
		},
	},
	enrollment: {
		select: { id: true, academicYear: true, rollNumber: true },
	},
};

export const createResult = async (
	schoolId: number,
	payload: CreateResultInput,
) => {
	const [student, exam, subject, enrollment] = await Promise.all([
		prisma.student.findFirst({ where: { id: payload.studentId, schoolId } }),
		prisma.exam.findFirst({ where: { id: payload.examId, schoolId } }),
		prisma.subject.findFirst({ where: { id: payload.subjectId, schoolId } }),
		prisma.enrollment.findFirst({
			where: {
				id: payload.enrollmentId,
				schoolId,
				studentId: payload.studentId,
			},
		}),
	]);

	if (!student) throw new AppError(404, "Student not found in this school");
	if (!exam) throw new AppError(404, "Exam not found in this school");
	if (!subject) throw new AppError(404, "Subject not found in this school");
	if (!enrollment) {
		throw new AppError(404, "Enrollment not found for this student");
	}

	if (payload.marks > subject.fullMarks) {
		throw new AppError(
			400,
			`Marks cannot exceed subject full marks (${subject.fullMarks})`,
		);
	}

	const duplicate = await prisma.result.findFirst({
		where: {
			studentId: payload.studentId,
			examId: payload.examId,
			subjectId: payload.subjectId,
		},
	});
	if (duplicate) {
		throw new AppError(
			409,
			"Result already exists for this student, exam, and subject",
		);
	}

	const computed = computeGrade(
		payload.marks,
		subject.fullMarks,
		subject.passMarks,
	);

	return prisma.result.create({
		data: {
			schoolId,
			studentId: payload.studentId,
			examId: payload.examId,
			subjectId: payload.subjectId,
			enrollmentId: payload.enrollmentId,
			marks: payload.marks,
			grade: payload.grade ?? computed.grade,
			gradePoint: payload.gradePoint ?? computed.gradePoint,
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
			...(payload.publishedAt !== undefined
				? { publishedAt: payload.publishedAt }
				: {}),
		},
		include: resultInclude,
	});
};

export const getResults = async (
	schoolId: number,
	query: ResultFilterQuery,
) => {
	return prisma.result.findMany({
		where: {
			schoolId,
			...(query.studentId !== undefined ? { studentId: query.studentId } : {}),
			...(query.examId !== undefined ? { examId: query.examId } : {}),
			...(query.subjectId !== undefined ? { subjectId: query.subjectId } : {}),
			...(query.enrollmentId !== undefined
				? { enrollmentId: query.enrollmentId }
				: {}),
		},
		include: resultInclude,
		orderBy: { createdAt: "desc" },
	});
};

export const getResultById = async (schoolId: number, id: number) => {
	const result = await prisma.result.findFirst({
		where: { id, schoolId },
		include: resultInclude,
	});

	if (!result) throw new AppError(404, "Result not found");
	return result;
};

export const updateResult = async (
	schoolId: number,
	id: number,
	payload: UpdateResultInput,
) => {
	const existing = await prisma.result.findFirst({
		where: { id, schoolId },
		include: { subject: { select: { fullMarks: true, passMarks: true } } },
	});

	if (!existing) throw new AppError(404, "Result not found");

	let nextGrade = payload.grade;
	let nextGradePoint = payload.gradePoint;

	if (payload.marks !== undefined) {
		if (payload.marks > existing.subject.fullMarks) {
			throw new AppError(
				400,
				`Marks cannot exceed subject full marks (${existing.subject.fullMarks})`,
			);
		}
		const computed = computeGrade(
			payload.marks,
			existing.subject.fullMarks,
			existing.subject.passMarks,
		);
		nextGrade = payload.grade ?? computed.grade;
		nextGradePoint = payload.gradePoint ?? computed.gradePoint;
	}

	return prisma.result.update({
		where: { id },
		data: {
			...(payload.marks !== undefined ? { marks: payload.marks } : {}),
			...(nextGrade !== undefined ? { grade: nextGrade } : {}),
			...(nextGradePoint !== undefined ? { gradePoint: nextGradePoint } : {}),
			...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
			...(payload.publishedAt !== undefined
				? { publishedAt: payload.publishedAt }
				: {}),
		},
		include: resultInclude,
	});
};

export const deleteResult = async (schoolId: number, id: number) => {
	const existing = await prisma.result.findFirst({
		where: { id, schoolId },
	});
	if (!existing) throw new AppError(404, "Result not found");
	return prisma.result.delete({ where: { id } });
};
