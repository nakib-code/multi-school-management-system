import AppError from "./appError.js";

export const roundMoney = (value: number): number =>
	Math.round((value + Number.EPSILON) * 100) / 100;

export const toDhakaDateKey = (date: Date): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Dhaka",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const y = parts.find((p) => p.type === "year")?.value ?? "2026";
	const m = parts.find((p) => p.type === "month")?.value ?? "01";
	const d = parts.find((p) => p.type === "day")?.value ?? "01";
	return `${y}-${m}-${d}`;
};

export const getTodayDhakaDateKey = (now: Date = new Date()): string =>
	toDhakaDateKey(now);

export const getCurrentDhakaMonth = (now: Date = new Date()): string =>
	toDhakaDateKey(now).slice(0, 7);

export const getDhakaStartOfToday = (now: Date = new Date()): Date =>
	new Date(`${toDhakaDateKey(now)}T00:00:00+06:00`);

export const getDhakaDayRange = (
	dateKey: string,
): { start: Date; end: Date } => {
	const start = new Date(`${dateKey}T00:00:00+06:00`);
	const end = new Date(`${dateKey}T23:59:59.999+06:00`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		throw new AppError(400, "Invalid date");
	}
	return { start, end };
};

export const enumerateDateKeys = (
	startKey: string,
	endKey: string,
	maxDays = 366,
): string[] => {
	const [sy = 0, sm = 0, sd = 0] = startKey.split("-").map(Number);
	const [ey = 0, em = 0, ed = 0] = endKey.split("-").map(Number);
	const cur = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
	const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));
	if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime()) || cur > end) {
		throw new AppError(400, "Invalid date range");
	}

	const keys: string[] = [];
	while (cur <= end) {
		if (keys.length >= maxDays) {
			throw new AppError(400, `Date range cannot exceed ${maxDays} days`);
		}
		const y = cur.getUTCFullYear();
		const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
		const d = String(cur.getUTCDate()).padStart(2, "0");
		keys.push(`${y}-${m}-${d}`);
		cur.setUTCDate(cur.getUTCDate() + 1);
	}
	return keys;
};

export const resolveMonthOrCustomDateRange = (
	billingMonth: string,
	startDate?: string,
	endDate?: string,
): {
	rangeStart: Date;
	rangeEnd: Date;
	startKey: string;
	endKey: string;
	dateKeys: string[];
	daysInMonth: number;
} => {
	const [yearStr = "2026", monthStr = "01"] = billingMonth.split("-");
	const year = Number(yearStr);
	const month = Number(monthStr);
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const lastDay = String(daysInMonth).padStart(2, "0");

	const startKey = startDate?.trim() || `${yearStr}-${monthStr}-01`;
	const endKey = endDate?.trim() || `${yearStr}-${monthStr}-${lastDay}`;

	const rangeStart = new Date(`${startKey}T00:00:00+06:00`);
	const rangeEnd = new Date(`${endKey}T23:59:59.999+06:00`);

	if (
		Number.isNaN(rangeStart.getTime()) ||
		Number.isNaN(rangeEnd.getTime()) ||
		rangeStart > rangeEnd
	) {
		throw new AppError(400, "Invalid date range");
	}

	const dateKeys = enumerateDateKeys(startKey, endKey);

	return {
		rangeStart,
		rangeEnd,
		startKey,
		endKey,
		dateKeys,
		daysInMonth,
	};
};
