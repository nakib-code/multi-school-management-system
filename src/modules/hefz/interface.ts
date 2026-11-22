import type {
	HefzAttendanceStatus,
	HefzEnrollmentStatus,
	HefzWing,
	SobokQuality,
} from "../../generated/prisma/client.js";

export interface CreateHefzEnrollmentInput {
	studentId: number;
	ustadId: number;
	wing?: HefzWing;
	currentPara?: number;
	currentSurah?: string;
	startDate?: Date;
	status?: HefzEnrollmentStatus;
}

export interface UpdateHefzEnrollmentInput {
	ustadId?: number;
	wing?: HefzWing;
	currentPara?: number | null;
	currentSurah?: string | null;
	status?: HefzEnrollmentStatus;
}

export interface HefzEnrollmentFilterQuery {
	studentId?: number;
	ustadId?: number;
	wing?: HefzWing;
	status?: HefzEnrollmentStatus;
}

export interface CreateHefzDailyLogInput {
	hefzEnrollmentId: number;
	logDate: Date;
	sobok: string;
	sobokPagesOrLines?: string;
	sobokQuality?: SobokQuality;
	sobokAm?: string;
	manzil?: string;
	manzilParas?: string;
	attendanceStatus?: HefzAttendanceStatus;
	ustadNote?: string;
	currentPara?: number;
	currentSurah?: string;
}

export interface UpdateHefzDailyLogInput {
	sobok?: string;
	sobokPagesOrLines?: string | null;
	sobokQuality?: SobokQuality;
	sobokAm?: string | null;
	manzil?: string | null;
	manzilParas?: string | null;
	attendanceStatus?: HefzAttendanceStatus;
	ustadNote?: string | null;
}

export interface HefzDailyLogFilterQuery {
	hefzEnrollmentId?: number;
	studentId?: number;
	ustadId?: number;
	wing?: HefzWing;
	sobokQuality?: SobokQuality;
	attendanceStatus?: HefzAttendanceStatus;
	fromDate?: Date;
	toDate?: Date;
}

export interface HefzProgressQuery {
	fromDate?: Date;
	toDate?: Date;
	limit?: number;
}
