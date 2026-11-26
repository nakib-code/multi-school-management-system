import type {
	AttendanceStatus,
	LeaveRequestStatus,
	UserRole,
} from "../../generated/prisma/client.js";

export interface AuthActor {
	userId: number;
	role: UserRole;
}

export interface CreateAttendanceInput {
	studentId: number;
	enrollmentId: number;
	date: string;
	status: AttendanceStatus;
	remarks?: string;
}

export interface BulkAttendanceRecordInput {
	studentId: number;
	enrollmentId: number;
	status: AttendanceStatus;
	remarks?: string;
}

export interface BulkAttendanceInput {
	date: string;
	records: BulkAttendanceRecordInput[];
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
	fromDate?: string;
	toDate?: string;
	search?: string;
	page?: number;
	pageSize?: number;
}

export interface DayAttendanceQuery {
	classId?: number;
	sectionId?: number;
	date: string;
}

export interface StudentCalendarQuery {
	studentId?: number;
	month: string;
}

export interface MonthlyReportQuery {
	month: string;
	classId: number;
	sectionId?: number;
}

export interface PublishMonthlyReportInput {
	month: string;
	classId: number;
	sectionId?: number;
}

export interface UpdateAttendanceSettingsInput {
	weeklyOffDays: number[];
}

export interface CreateHolidayInput {
	date: string;
	title: string;
}

export interface HolidayListQuery {
	month?: string;
	year?: number;
}

export interface CreateLeaveRequestInput {
	studentId: number;
	fromDate: string;
	toDate: string;
	reason: string;
}

export interface LeaveRequestFilterQuery {
	status?: LeaveRequestStatus;
	studentId?: number;
	classId?: number;
	sectionId?: number;
}

export interface ReviewLeaveRequestInput {
	status: "APPROVED" | "REJECTED";
	reviewNote?: string;
}
