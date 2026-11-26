import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	getMonthDateBounds,
	parseLocalDateToUtcMidnight,
} from "../../utils/attendanceDate.js";
import { getSchoolWeeklyOffDays } from "./helpers.js";
import type {
	CreateHolidayInput,
	HolidayListQuery,
	UpdateAttendanceSettingsInput,
} from "./interface.js";

export const getAttendanceSettings = async (schoolId: number) => {
	const weeklyOffDays = await getSchoolWeeklyOffDays(schoolId);
	return { schoolId, weeklyOffDays };
};

export const updateAttendanceSettings = async (
	schoolId: number,
	payload: UpdateAttendanceSettingsInput,
) => {
	const uniqueDays = Array.from(new Set(payload.weeklyOffDays)).sort(
		(a, b) => a - b,
	);
	if (uniqueDays.length >= 7) {
		throw new AppError(
			400,
			"At least one day of the week must be a working day",
		);
	}

	const saved = await prisma.schoolSetting.upsert({
		where: { schoolId },
		create: {
			schoolId,
			weeklyOffDays: uniqueDays,
		},
		update: {
			weeklyOffDays: uniqueDays,
		},
		select: { schoolId: true, weeklyOffDays: true },
	});

	return saved;
};

export const getHolidays = async (
	schoolId: number,
	query: HolidayListQuery,
) => {
	const dateFilter: { gte?: Date; lte?: Date } = {};
	if (query.month) {
		const bounds = getMonthDateBounds(query.month);
		dateFilter.gte = bounds.fromDate;
		dateFilter.lte = bounds.toDate;
	} else if (query.year) {
		dateFilter.gte = parseLocalDateToUtcMidnight(`${query.year}-01-01`);
		dateFilter.lte = parseLocalDateToUtcMidnight(`${query.year}-12-31`);
	}

	return prisma.schoolHoliday.findMany({
		where: {
			schoolId,
			...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
		},
		orderBy: { date: "asc" },
	});
};

export const createHoliday = async (
	schoolId: number,
	payload: CreateHolidayInput,
) => {
	const utcDate = parseLocalDateToUtcMidnight(payload.date);
	return prisma.schoolHoliday.upsert({
		where: { schoolId_date: { schoolId, date: utcDate } },
		create: {
			schoolId,
			date: utcDate,
			title: payload.title.trim(),
		},
		update: {
			title: payload.title.trim(),
		},
	});
};

export const deleteHoliday = async (schoolId: number, id: number) => {
	const existing = await prisma.schoolHoliday.findFirst({
		where: { id, schoolId },
	});
	if (!existing) {
		throw new AppError(404, "Holiday not found");
	}
	return prisma.schoolHoliday.delete({ where: { id } });
};
