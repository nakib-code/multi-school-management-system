import type { AttendanceStatus } from "../generated/prisma/client.js";

export const SCHOOL_TIMEZONE = "Asia/Dhaka";
export const DEFAULT_WEEKLY_OFF_DAYS: readonly number[] = [5]; // Friday
export const TEACHER_EDIT_WINDOW_DAYS = 3; // Today + previous 3 days

const YYYY_MM_DD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YYYY_MM_RE = /^(\d{4})-(\d{2})$/;

/**
 * Returns today's date as YYYY-MM-DD in school-local timezone (Asia/Dhaka).
 * Never uses UTC toISOString().slice(0, 10).
 */
export function getSchoolTodayStr(now: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: SCHOOL_TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);

	const year = parts.find((p) => p.type === "year")?.value ?? "1970";
	const month = parts.find((p) => p.type === "month")?.value ?? "01";
	const day = parts.find((p) => p.type === "day")?.value ?? "01";
	return `${year}-${month}-${day}`;
}

/**
 * Returns current month as YYYY-MM in Asia/Dhaka timezone.
 */
export function getSchoolCurrentMonthStr(now: Date = new Date()): string {
	return getSchoolTodayStr(now).slice(0, 7);
}

/**
 * Parses a YYYY-MM-DD local date string into a Date at UTC midnight of that exact calendar date.
 */
export function parseLocalDateToUtcMidnight(dateStr: string): Date {
	const match = YYYY_MM_DD_RE.exec(dateStr.trim());
	if (!match) {
		throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD`);
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
	if (
		d.getUTCFullYear() !== year ||
		d.getUTCMonth() !== month - 1 ||
		d.getUTCDate() !== day
	) {
		throw new Error(`Invalid calendar date "${dateStr}"`);
	}
	return d;
}

/**
 * Formats a UTC-midnight Date stored in PostgreSQL back to YYYY-MM-DD.
 */
export function formatUtcMidnightToLocalStr(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

/**
 * Accepts either a YYYY-MM-DD string or Date and normalizes to YYYY-MM-DD + UTC midnight Date.
 */
export function normalizeSchoolDate(input: string | Date): {
	dateStr: string;
	utcMidnight: Date;
} {
	if (typeof input === "string") {
		const trimmed = input.trim();
		const dateStr = YYYY_MM_DD_RE.test(trimmed)
			? trimmed
			: formatUtcMidnightToLocalStr(new Date(trimmed));
		return { dateStr, utcMidnight: parseLocalDateToUtcMidnight(dateStr) };
	}
	const dateStr = formatUtcMidnightToLocalStr(input);
	return { dateStr, utcMidnight: parseLocalDateToUtcMidnight(dateStr) };
}

/**
 * Returns day-of-week (0 = Sunday, ..., 5 = Friday, 6 = Saturday) for a YYYY-MM-DD string.
 */
export function getDayOfWeek(dateStr: string): number {
	return parseLocalDateToUtcMidnight(dateStr).getUTCDay();
}

/**
 * Returns whole calendar day difference: (a - b) in days for YYYY-MM-DD strings.
 */
export function diffCalendarDays(dateA: string, dateB: string): number {
	const msA = parseLocalDateToUtcMidnight(dateA).getTime();
	const msB = parseLocalDateToUtcMidnight(dateB).getTime();
	return Math.round((msA - msB) / 86_400_000);
}

/**
 * Rule 4: Teachers can create/edit only for today and the previous 3 days.
 * Rejects future dates (> today) and dates older than 3 days before today.
 */
export function isWithinTeacherEditWindow(
	dateStr: string,
	todayStr: string = getSchoolTodayStr(),
): boolean {
	const diff = diffCalendarDays(todayStr, dateStr);
	return diff >= 0 && diff <= TEACHER_EDIT_WINDOW_DAYS;
}

/**
 * Month bounds for a YYYY-MM string, plus previous month YYYY-MM.
 */
export function getMonthDateBounds(month: string): {
	year: number;
	monthNum: number;
	totalDays: number;
	fromStr: string;
	toStr: string;
	fromDate: Date;
	toDate: Date;
	prevMonth: string;
} {
	const match = YYYY_MM_RE.exec(month.trim());
	if (!match) {
		throw new Error(`Invalid month "${month}". Expected YYYY-MM`);
	}
	const year = Number(match[1]);
	const monthNum = Number(match[2]);
	if (monthNum < 1 || monthNum > 12) {
		throw new Error(`Invalid month number in "${month}"`);
	}
	const totalDays = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
	const mm = String(monthNum).padStart(2, "0");
	const fromStr = `${year}-${mm}-01`;
	const toStr = `${year}-${mm}-${String(totalDays).padStart(2, "0")}`;

	const prevYear = monthNum === 1 ? year - 1 : year;
	const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
	const prevMonth = `${prevYear}-${String(prevMonthNum).padStart(2, "0")}`;

	return {
		year,
		monthNum,
		totalDays,
		fromStr,
		toStr,
		fromDate: parseLocalDateToUtcMidnight(fromStr),
		toDate: parseLocalDateToUtcMidnight(toStr),
		prevMonth,
	};
}

/**
 * Rule 2 & 3: Counts working days in a month.
 * - Working day = not in weeklyOffDays and not in holidayDateStrs.
 * - For the current month, counts working days only up to todayStr.
 * - For future months, returns 0 working days.
 */
export function countWorkingDaysInMonth(
	month: string,
	weeklyOffDays: readonly number[],
	holidayDateStrs: ReadonlySet<string>,
	todayStr: string = getSchoolTodayStr(),
): {
	workingDays: number;
	workingDateStrs: string[];
	weeklyOffDateStrs: string[];
} {
	const { year, monthNum, totalDays } = getMonthDateBounds(month);
	const offSet = new Set(weeklyOffDays);
	const currentMonth = todayStr.slice(0, 7);
	const workingDateStrs: string[] = [];
	const weeklyOffDateStrs: string[] = [];

	const maxDayToCount =
		month > currentMonth
			? 0
			: month === currentMonth
				? Math.min(totalDays, Number(todayStr.slice(8, 10)))
				: totalDays;

	for (let day = 1; day <= totalDays; day++) {
		const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const dow = getDayOfWeek(dateStr);
		const isWeeklyOff = offSet.has(dow);
		if (isWeeklyOff) {
			weeklyOffDateStrs.push(dateStr);
		}
		if (day <= maxDayToCount && !isWeeklyOff && !holidayDateStrs.has(dateStr)) {
			workingDateStrs.push(dateStr);
		}
	}

	return {
		workingDays: workingDateStrs.length,
		workingDateStrs,
		weeklyOffDateStrs,
	};
}

/**
 * Rule 3: Attendance % = (Present + Late) / (Working Days - Excused) * 100.
 * Guards divide-by-zero and clamps to [0, 100], rounded to 1 decimal place.
 */
export function calculateAttendanceRate(
	present: number,
	late: number,
	excused: number,
	workingDays: number,
): number {
	const denominator = workingDays - excused;
	if (denominator <= 0) return 0;
	const raw = ((present + late) / denominator) * 100;
	const clamped = Math.max(0, Math.min(100, raw));
	return Math.round(clamped * 10) / 10;
}

const ALERTABLE_STATUSES = new Set<AttendanceStatus>([
	"ABSENT",
	"LATE",
	"EXCUSED",
]);

/**
 * Rule 5:
 * - Never notify when a re-save did not change status/remarks.
 * - Never notify for PRESENT unless status changed AWAY FROM ABSENT/LATE/EXCUSED.
 * - Notify when status/remarks changed and newStatus is ABSENT/LATE/EXCUSED,
 *   OR when status changed away from ABSENT/LATE/EXCUSED (e.g. ABSENT -> PRESENT correction).
 */
export function shouldNotifyGuardianForChange(
	oldStatus: AttendanceStatus | null,
	oldRemarks: string | null,
	newStatus: AttendanceStatus,
	newRemarks: string | null,
): boolean {
	const normOldRemarks = (oldRemarks ?? "").trim();
	const normNewRemarks = (newRemarks ?? "").trim();

	const statusChanged = oldStatus !== newStatus;
	const remarksChanged =
		oldStatus !== null && normOldRemarks !== normNewRemarks;

	if (!statusChanged && !remarksChanged) {
		return false;
	}

	if (ALERTABLE_STATUSES.has(newStatus)) {
		return true;
	}

	if (
		oldStatus !== null &&
		ALERTABLE_STATUSES.has(oldStatus) &&
		statusChanged
	) {
		return true;
	}

	return false;
}
