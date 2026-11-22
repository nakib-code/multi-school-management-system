import type { ExamStatus, ExamType } from "../../generated/prisma/client.js";

export interface CreateExamInput {
	classId: number;
	sectionId?: number;
	name: string;
	type: ExamType;
	academicYear: string;
	startDate: Date;
	endDate: Date;
	status?: ExamStatus;
}

export interface UpdateExamInput {
	classId?: number;
	sectionId?: number | null;
	name?: string;
	type?: ExamType;
	academicYear?: string;
	startDate?: Date;
	endDate?: Date;
	status?: ExamStatus;
}

export interface ExamFilterQuery {
	classId?: number;
	sectionId?: number;
	type?: ExamType;
	status?: ExamStatus;
	academicYear?: string;
}
