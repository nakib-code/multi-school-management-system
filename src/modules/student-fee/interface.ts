import type { FeeStatus, FeeType } from "../../generated/prisma/client.js";

export interface CreateStudentFeeInput {
	studentId: number;
	enrollmentId: number;
	feeType: FeeType;
	title: string;
	amount: number;
	dueDate: Date;
	status?: FeeStatus;
	description?: string;
}

export interface UpdateStudentFeeInput {
	feeType?: FeeType;
	title?: string;
	amount?: number;
	dueDate?: Date;
	status?: FeeStatus;
	description?: string | null;
}

export interface StudentFeeFilterQuery {
	studentId?: number;
	enrollmentId?: number;
	feeType?: FeeType;
	status?: FeeStatus;
}
