import type { Grade } from "../../generated/prisma/client.js";

export interface CreateResultInput {
	studentId: number;
	examId: number;
	subjectId: number;
	enrollmentId: number;
	marks: number;
	grade?: Grade;
	gradePoint?: number;
	remarks?: string;
	publishedAt?: Date;
}

export interface UpdateResultInput {
	marks?: number;
	grade?: Grade;
	gradePoint?: number;
	remarks?: string | null;
	publishedAt?: Date | null;
}

export interface ResultFilterQuery {
	studentId?: number;
	examId?: number;
	subjectId?: number;
	enrollmentId?: number;
}
