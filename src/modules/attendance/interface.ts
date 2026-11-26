import type { AttendanceStatus } from "../../generated/prisma/client.js";

export interface CreateAttendanceInput {
	studentId: number;
	enrollmentId: number;
	date: Date;
	status: AttendanceStatus;
	remarks?: string;
}

export interface BulkAttendanceInput {
	date: Date;
	records: Array<{
		studentId: number;
		enrollmentId: number;
		status: AttendanceStatus;
		remarks?: string;
	}>;
}

export interface UpdateAttendanceInput {
	status?: AttendanceStatus;
	remarks?: string | null;
}

export interface AttendanceFilterQuery {
	studentId?: number;
	enrollmentId?: number;
	classId?: number;
	sectionId?: number;
	status?: AttendanceStatus;
	fromDate?: Date;
	toDate?: Date;
}
