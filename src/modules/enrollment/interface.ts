import type { EnrollmentStatus } from "../../generated/prisma/client.js";

export interface CreateEnrollmentInput {
	studentId: number;
	classId: number;
	sectionId?: number;
	academicYear: string;
	rollNumber?: number;
	status?: EnrollmentStatus;
}

export interface UpdateEnrollmentInput {
	classId?: number;
	sectionId?: number | null;
	academicYear?: string;
	rollNumber?: number | null;
	status?: EnrollmentStatus;
}

export interface EnrollmentFilterQuery {
	studentId?: number;
	classId?: number;
	sectionId?: number;
	academicYear?: string;
	status?: EnrollmentStatus;
}
