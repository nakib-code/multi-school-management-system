import type { FeeStatus, FeeType } from "../../generated/prisma/client.js";

export interface CreateStudentFeeInput {
	studentId: number;
	enrollmentId: number;
	feeType: FeeType;
	title: string;
	amount?: number;
	useClassDefaultAmount?: boolean;
	dueDate: Date;
	academicYear?: string;
	billingMonth?: string;
	examId?: number;
	status?: FeeStatus;
	description?: string;
}

export interface BulkCreateStudentFeeInput {
	classId: number;
	sectionId?: number;
	academicYear?: string;
	feeType: FeeType;
	title: string;
	amount?: number;
	useClassDefaultAmount?: boolean;
	dueDate: Date;
	billingMonth?: string;
	examId?: number;
	description?: string;
}

export interface UpdateStudentFeeInput {
	feeType?: FeeType;
	title?: string;
	amount?: number;
	dueDate?: Date;
	academicYear?: string | null;
	billingMonth?: string | null;
	examId?: number | null;
	status?: FeeStatus;
	description?: string | null;
	remarks?: string | null;
}

export interface StudentFeeFilterQuery {
	studentId?: number;
	enrollmentId?: number;
	classId?: number;
	sectionId?: number;
	academicYear?: string;
	feeType?: FeeType;
	billingMonth?: string;
	examId?: number;
	status?: FeeStatus;
}
