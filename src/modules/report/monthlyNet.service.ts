import {
	AdmissionPaymentStatus,
	PaymentStatus,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { formatDateKey } from "../custom-expense/service.js";
import type { UnifiedIncomeCategory } from "../income/interface.js";
import {
	getCurrentDhakaMonth,
	INCOME_CATEGORY_LABELS,
	mapFeeTypeToIncomeCategory,
	resolveMonthDateRange,
	toDhakaDateKey,
} from "../income/service.js";

export type NetBalanceStatus = "SURPLUS" | "DEFICIT";

export interface MonthlyNetQuery {
	billingMonth?: string;
	trendMonths?: number;
}

const ALL_INCOME_CATEGORIES: UnifiedIncomeCategory[] = [
	"MONTHLY_FEE",
	"ADMISSION_FEE",
	"OTHER_STUDENT_FEE",
	"OTHER_INCOME",
];

const roundMoney = (value: number): number =>
	Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Returns `count` trailing YYYY-MM keys ending at `endMonth` in chronological order.
 */
export const buildTrailingMonths = (
	endMonth: string,
	count: number,
): string[] => {
	const [yStr = "2026", mStr = "01"] = endMonth.split("-");
	const endYear = Number(yStr);
	const endMonthIdx = Number(mStr) - 1;
	const months: string[] = [];

	for (let offset = count - 1; offset >= 0; offset -= 1) {
		const dt = new Date(Date.UTC(endYear, endMonthIdx - offset, 1));
		const y = dt.getUTCFullYear();
		const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
		months.push(`${y}-${m}`);
	}

	return months;
};

export const computeExpenseSharePercent = (
	totalIncome: number,
	totalExpense: number,
): number => {
	if (totalIncome > 0) {
		return Math.round((totalExpense / totalIncome) * 1000) / 10;
	}
	return totalExpense > 0 ? 100 : 0;
};

export const getMonthlyNetReport = async (
	schoolId: number,
	query: MonthlyNetQuery = {},
) => {
	const billingMonth = query.billingMonth?.trim() || getCurrentDhakaMonth();
	const trendMonthsCount = Math.min(
		12,
		Math.max(1, Number(query.trendMonths ?? 6) || 6),
	);

	const trendMonthKeys = buildTrailingMonths(billingMonth, trendMonthsCount);
	const earliestMonth = trendMonthKeys[0] ?? billingMonth;

	const { rangeStart: windowStart } = resolveMonthDateRange(earliestMonth);
	const { rangeEnd: windowEnd, daysInMonth } =
		resolveMonthDateRange(billingMonth);

	const [
		school,
		studentPayments,
		unlinkedAdmissionPayments,
		manualIncomeEntries,
		expenseEntries,
	] = await Promise.all([
		prisma.school.findUnique({
			where: { id: schoolId },
			select: {
				id: true,
				name: true,
				code: true,
				logo: true,
				address: true,
				phone: true,
				email: true,
			},
		}),
		prisma.studentPayment.findMany({
			where: {
				schoolId,
				status: PaymentStatus.VERIFIED,
				paidAt: { gte: windowStart, lte: windowEnd },
			},
			select: {
				paidAmount: true,
				paidAt: true,
				fee: { select: { feeType: true } },
			},
		}),
		prisma.admissionPayment.findMany({
			where: {
				schoolId,
				status: AdmissionPaymentStatus.PAID,
				studentFee: { is: null },
				OR: [
					{ paidAt: { gte: windowStart, lte: windowEnd } },
					{ paidAt: null, createdAt: { gte: windowStart, lte: windowEnd } },
				],
			},
			select: {
				amount: true,
				paidAt: true,
				createdAt: true,
			},
		}),
		prisma.incomeEntry.findMany({
			where: {
				schoolId,
				incomeDate: { gte: windowStart, lte: windowEnd },
			},
			select: {
				amount: true,
				incomeDate: true,
				billingMonth: true,
			},
		}),
		prisma.customExpenseEntry.findMany({
			where: {
				schoolId,
				billingMonth: { in: trendMonthKeys },
			},
			select: {
				amount: true,
				entryDate: true,
				billingMonth: true,
				sheetId: true,
				sheet: { select: { id: true, name: true } },
			},
		}),
	]);

	if (!school) {
		throw new AppError(404, "School not found");
	}

	// Trailing trend buckets keyed by YYYY-MM
	const trendMap = new Map<
		string,
		{ totalIncome: number; totalExpense: number }
	>();
	for (const key of trendMonthKeys) {
		trendMap.set(key, { totalIncome: 0, totalExpense: 0 });
	}

	// Selected month income breakdown
	const incomeCats: Record<
		UnifiedIncomeCategory,
		{ amount: number; count: number }
	> = {
		MONTHLY_FEE: { amount: 0, count: 0 },
		ADMISSION_FEE: { amount: 0, count: 0 },
		OTHER_STUDENT_FEE: { amount: 0, count: 0 },
		OTHER_INCOME: { amount: 0, count: 0 },
	};

	// Selected month daily map
	const dailyMap = new Map<string, { income: number; expense: number }>();

	const addIncomePoint = (
		dateKey: string,
		category: UnifiedIncomeCategory,
		amount: number,
	) => {
		const monthKey = dateKey.slice(0, 7);
		const trendBucket = trendMap.get(monthKey);
		if (trendBucket) {
			trendBucket.totalIncome = roundMoney(trendBucket.totalIncome + amount);
		}
		if (monthKey === billingMonth) {
			incomeCats[category].amount = roundMoney(
				incomeCats[category].amount + amount,
			);
			incomeCats[category].count += 1;

			const dayBucket = dailyMap.get(dateKey) ?? { income: 0, expense: 0 };
			dayBucket.income = roundMoney(dayBucket.income + amount);
			dailyMap.set(dateKey, dayBucket);
		}
	};

	for (const sp of studentPayments) {
		const dateKey = toDhakaDateKey(sp.paidAt);
		const cat = mapFeeTypeToIncomeCategory(sp.fee.feeType);
		addIncomePoint(dateKey, cat, roundMoney(Number(sp.paidAmount)));
	}

	for (const ap of unlinkedAdmissionPayments) {
		const dateKey = toDhakaDateKey(ap.paidAt ?? ap.createdAt);
		addIncomePoint(dateKey, "ADMISSION_FEE", roundMoney(Number(ap.amount)));
	}

	for (const ie of manualIncomeEntries) {
		const dateKey = toDhakaDateKey(ie.incomeDate);
		addIncomePoint(dateKey, "OTHER_INCOME", roundMoney(Number(ie.amount)));
	}

	// Selected month sheet-wise expense breakdown
	const sheetExpenseMap = new Map<
		number,
		{
			sheetId: number;
			sheetName: string;
			totalAmount: number;
			entryCount: number;
		}
	>();

	for (const exp of expenseEntries) {
		const amount = roundMoney(Number(exp.amount));
		const trendBucket = trendMap.get(exp.billingMonth);
		if (trendBucket) {
			trendBucket.totalExpense = roundMoney(trendBucket.totalExpense + amount);
		}

		if (exp.billingMonth === billingMonth) {
			const dateKey = formatDateKey(exp.entryDate);
			const dayBucket = dailyMap.get(dateKey) ?? { income: 0, expense: 0 };
			dayBucket.expense = roundMoney(dayBucket.expense + amount);
			dailyMap.set(dateKey, dayBucket);

			const sheetBucket = sheetExpenseMap.get(exp.sheetId) ?? {
				sheetId: exp.sheetId,
				sheetName: exp.sheet.name,
				totalAmount: 0,
				entryCount: 0,
			};
			sheetBucket.totalAmount = roundMoney(sheetBucket.totalAmount + amount);
			sheetBucket.entryCount += 1;
			sheetExpenseMap.set(exp.sheetId, sheetBucket);
		}
	}

	const totalIncome = roundMoney(
		incomeCats.MONTHLY_FEE.amount +
			incomeCats.ADMISSION_FEE.amount +
			incomeCats.OTHER_STUDENT_FEE.amount +
			incomeCats.OTHER_INCOME.amount,
	);

	const selectedTrend = trendMap.get(billingMonth);
	const totalExpense = roundMoney(selectedTrend?.totalExpense ?? 0);
	const netBalance = roundMoney(totalIncome - totalExpense);
	const status: NetBalanceStatus = netBalance >= 0 ? "SURPLUS" : "DEFICIT";
	const expenseSharePercent = computeExpenseSharePercent(
		totalIncome,
		totalExpense,
	);

	const incomeByCategory = ALL_INCOME_CATEGORIES.map((category) => {
		const amount = incomeCats[category].amount;
		const count = incomeCats[category].count;
		const percentage =
			totalIncome > 0 ? Math.round((amount / totalIncome) * 1000) / 10 : 0;
		return {
			category,
			label: INCOME_CATEGORY_LABELS[category],
			amount,
			count,
			percentage,
		};
	});

	const expenseBySheet = [...sheetExpenseMap.values()]
		.sort((a, b) => b.totalAmount - a.totalAmount)
		.map((item) => ({
			...item,
			percentage:
				totalExpense > 0
					? Math.round((item.totalAmount / totalExpense) * 1000) / 10
					: 0,
		}));

	const [yearStr = "2026", monthStr = "01"] = billingMonth.split("-");
	const dailySeries = Array.from({ length: daysInMonth }, (_, idx) => {
		const day = idx + 1;
		const date = `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`;
		const bucket = dailyMap.get(date);
		const income = bucket?.income ?? 0;
		const expense = bucket?.expense ?? 0;
		return {
			date,
			day,
			income,
			expense,
			net: roundMoney(income - expense),
		};
	});

	const trend = trendMonthKeys.map((monthKey) => {
		const bucket = trendMap.get(monthKey) ?? {
			totalIncome: 0,
			totalExpense: 0,
		};
		const net = roundMoney(bucket.totalIncome - bucket.totalExpense);
		return {
			billingMonth: monthKey,
			totalIncome: bucket.totalIncome,
			totalExpense: bucket.totalExpense,
			netBalance: net,
			status: (net >= 0 ? "SURPLUS" : "DEFICIT") as NetBalanceStatus,
		};
	});

	return {
		school,
		billingMonth,
		trendMonths: trendMonthsCount,
		summary: {
			totalIncome,
			totalExpense,
			netBalance,
			status,
			expenseSharePercent,
		},
		incomeBreakdown: {
			monthlyFeeTotal: incomeCats.MONTHLY_FEE.amount,
			admissionFeeTotal: incomeCats.ADMISSION_FEE.amount,
			otherStudentFeeTotal: incomeCats.OTHER_STUDENT_FEE.amount,
			otherIncomeTotal: incomeCats.OTHER_INCOME.amount,
			byCategory: incomeByCategory,
		},
		expenseBreakdown: expenseBySheet,
		dailySeries,
		trend,
	};
};
