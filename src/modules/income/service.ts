import {
	AdmissionPaymentStatus,
	FeeType,
	IncomeEntryCategory,
	PaymentMethod,
	PaymentStatus,
	Prisma,
	SequenceDocumentType,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	getCurrentDhakaMonth as getDhakaMonth,
	resolveMonthOrCustomDateRange,
	roundMoney,
	toDhakaDateKey as toDhakaDate,
} from "../../utils/dhakaDate.js";
import { generateNextDocumentNumber } from "../../utils/documentSequence.js";
import type {
	CreateOtherIncomeInput,
	IncomeCategoryFilter,
	IncomeChartQuery,
	IncomeSummaryQuery,
	UnifiedIncomeCategory,
	UnifiedIncomeRow,
	UpdateOtherIncomeInput,
} from "./interface.js";

export const INCOME_CATEGORY_LABELS: Record<UnifiedIncomeCategory, string> = {
	MONTHLY_FEE: "ছাত্রদের মাসিক ফি",
	ADMISSION_FEE: "ছাত্রদের অ্যাডমিশন ফি",
	OTHER_STUDENT_FEE: "অন্যান্য ছাত্র ফি",
	OTHER_INCOME: "অন্যান্য আয়",
};

const ALL_CATEGORIES: UnifiedIncomeCategory[] = [
	"MONTHLY_FEE",
	"ADMISSION_FEE",
	"OTHER_STUDENT_FEE",
	"OTHER_INCOME",
];

export const toDhakaDateKey = toDhakaDate;
export const getCurrentDhakaMonth = getDhakaMonth;

export const normalizeIncomeDate = (
	rawDate?: string,
	now: Date = new Date(),
): { incomeDate: Date; dateKey: string; billingMonth: string } => {
	const effective = rawDate?.trim() || toDhakaDateKey(now);
	const [y = 0, m = 0, d = 0] = effective.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
	if (
		!y ||
		!m ||
		!d ||
		dt.getUTCFullYear() !== y ||
		dt.getUTCMonth() !== m - 1 ||
		dt.getUTCDate() !== d
	) {
		throw new AppError(400, "Invalid income date");
	}
	const dateKey = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
	return {
		incomeDate: dt,
		dateKey,
		billingMonth: dateKey.slice(0, 7),
	};
};

export const resolveMonthDateRange = (
	billingMonth: string,
	startDate?: string,
	endDate?: string,
) => resolveMonthOrCustomDateRange(billingMonth, startDate, endDate);

export const mapFeeTypeToIncomeCategory = (
	feeType: FeeType,
): UnifiedIncomeCategory => {
	if (feeType === FeeType.MONTHLY) return "MONTHLY_FEE";
	if (feeType === FeeType.ADMISSION) return "ADMISSION_FEE";
	return "OTHER_STUDENT_FEE";
};

export const createOtherIncomeEntry = async (
	schoolId: number,
	recordedById: number,
	payload: CreateOtherIncomeInput,
) => {
	const { incomeDate, billingMonth, dateKey } = normalizeIncomeDate(
		payload.incomeDate,
	);

	const created = await prisma.$transaction(async (tx) => {
		const receiptNo = await generateNextDocumentNumber(
			tx,
			schoolId,
			SequenceDocumentType.DONATION_RECEIPT,
			incomeDate,
		);

		return tx.incomeEntry.create({
			data: {
				schoolId,
				category: IncomeEntryCategory.OTHER_INCOME,
				sourceLabel: payload.sourceLabel.trim(),
				title: payload.title.trim(),
				amount: new Prisma.Decimal(roundMoney(payload.amount).toFixed(2)),
				incomeDate,
				billingMonth,
				paymentMethod: payload.paymentMethod ?? PaymentMethod.CASH,
				receiptNo,
				referenceNo: payload.referenceNo?.trim() || null,
				notes: payload.notes?.trim() || null,
				recordedById,
			},
			include: {
				recordedBy: { select: { id: true, name: true, role: true } },
			},
		});
	});

	return {
		id: created.id,
		schoolId: created.schoolId,
		category: created.category,
		sourceLabel: created.sourceLabel,
		title: created.title,
		amount: roundMoney(Number(created.amount)),
		incomeDate: dateKey,
		billingMonth: created.billingMonth,
		paymentMethod: created.paymentMethod,
		receiptNo: created.receiptNo,
		referenceNo: created.referenceNo,
		notes: created.notes,
		recordedBy: created.recordedBy,
		createdAt: created.createdAt,
		updatedAt: created.updatedAt,
	};
};

export const updateOtherIncomeEntry = async (
	schoolId: number,
	id: number,
	payload: UpdateOtherIncomeInput,
) => {
	const existing = await prisma.incomeEntry.findFirst({
		where: { id, schoolId },
	});
	if (!existing) {
		throw new AppError(404, "Income entry not found");
	}

	const previous = {
		sourceLabel: existing.sourceLabel,
		title: existing.title,
		amount: roundMoney(Number(existing.amount)),
		incomeDate: toDhakaDateKey(existing.incomeDate),
		billingMonth: existing.billingMonth,
		paymentMethod: existing.paymentMethod,
	};

	const dateUpdate =
		payload.incomeDate !== undefined
			? normalizeIncomeDate(payload.incomeDate)
			: null;

	const updated = await prisma.incomeEntry.update({
		where: { id: existing.id },
		data: {
			...(payload.sourceLabel !== undefined
				? { sourceLabel: payload.sourceLabel.trim() }
				: {}),
			...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
			...(payload.amount !== undefined
				? {
						amount: new Prisma.Decimal(roundMoney(payload.amount).toFixed(2)),
					}
				: {}),
			...(dateUpdate
				? {
						incomeDate: dateUpdate.incomeDate,
						billingMonth: dateUpdate.billingMonth,
					}
				: {}),
			...(payload.paymentMethod !== undefined
				? { paymentMethod: payload.paymentMethod }
				: {}),
			...(payload.referenceNo !== undefined
				? { referenceNo: payload.referenceNo?.trim() || null }
				: {}),
			...(payload.notes !== undefined
				? { notes: payload.notes?.trim() || null }
				: {}),
		},
		include: {
			recordedBy: { select: { id: true, name: true, role: true } },
		},
	});

	return {
		id: updated.id,
		schoolId: updated.schoolId,
		category: updated.category,
		sourceLabel: updated.sourceLabel,
		title: updated.title,
		amount: roundMoney(Number(updated.amount)),
		incomeDate: toDhakaDateKey(updated.incomeDate),
		billingMonth: updated.billingMonth,
		paymentMethod: updated.paymentMethod,
		receiptNo: updated.receiptNo,
		referenceNo: updated.referenceNo,
		notes: updated.notes,
		recordedBy: updated.recordedBy,
		createdAt: updated.createdAt,
		updatedAt: updated.updatedAt,
		previous,
	};
};

export const deleteOtherIncomeEntry = async (schoolId: number, id: number) => {
	const existing = await prisma.incomeEntry.findFirst({
		where: { id, schoolId },
		select: {
			id: true,
			sourceLabel: true,
			title: true,
			amount: true,
			billingMonth: true,
			receiptNo: true,
			paymentMethod: true,
		},
	});
	if (!existing) {
		throw new AppError(404, "Income entry not found");
	}

	await prisma.incomeEntry.delete({
		where: { id: existing.id },
	});

	return {
		id: existing.id,
		sourceLabel: existing.sourceLabel,
		title: existing.title,
		amount: roundMoney(Number(existing.amount)),
		billingMonth: existing.billingMonth,
		receiptNo: existing.receiptNo,
		paymentMethod: existing.paymentMethod,
	};
};

const fetchUnifiedIncomeRows = async (
	schoolId: number,
	rangeStart: Date,
	rangeEnd: Date,
): Promise<Omit<UnifiedIncomeRow, "serial">[]> => {
	const [studentPayments, unlinkedAdmissionPayments, manualEntries] =
		await Promise.all([
			prisma.studentPayment.findMany({
				where: {
					schoolId,
					status: PaymentStatus.VERIFIED,
					paidAt: { gte: rangeStart, lte: rangeEnd },
				},
				select: {
					id: true,
					paidAmount: true,
					paymentMethod: true,
					trxId: true,
					receiptNo: true,
					paidAt: true,
					remarks: true,
					student: {
						select: {
							firstName: true,
							lastName: true,
							studentId: true,
						},
					},
					fee: {
						select: {
							feeType: true,
							title: true,
							billingMonth: true,
						},
					},
					verifiedBy: {
						select: { name: true },
					},
				},
				orderBy: [{ paidAt: "asc" }, { id: "asc" }],
			}),
			// Only include paid AdmissionPayments that have NOT been synced into a StudentFee
			prisma.admissionPayment.findMany({
				where: {
					schoolId,
					status: AdmissionPaymentStatus.PAID,
					studentFee: { is: null },
					OR: [
						{ paidAt: { gte: rangeStart, lte: rangeEnd } },
						{ paidAt: null, createdAt: { gte: rangeStart, lte: rangeEnd } },
					],
				},
				select: {
					id: true,
					amount: true,
					paymentMethod: true,
					transactionId: true,
					paidAt: true,
					createdAt: true,
					remarks: true,
					admission: {
						select: {
							studentName: true,
							applicationNo: true,
						},
					},
					receivedByUser: {
						select: { name: true },
					},
				},
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			}),
			prisma.incomeEntry.findMany({
				where: {
					schoolId,
					incomeDate: { gte: rangeStart, lte: rangeEnd },
				},
				select: {
					id: true,
					sourceLabel: true,
					title: true,
					amount: true,
					incomeDate: true,
					billingMonth: true,
					paymentMethod: true,
					receiptNo: true,
					referenceNo: true,
					notes: true,
					recordedBy: {
						select: { name: true },
					},
				},
				orderBy: [{ incomeDate: "asc" }, { id: "asc" }],
			}),
		]);

	const unified: Omit<UnifiedIncomeRow, "serial">[] = [];

	for (const sp of studentPayments) {
		const dateKey = toDhakaDateKey(sp.paidAt);
		const category = mapFeeTypeToIncomeCategory(sp.fee.feeType);
		const studentName =
			`${sp.student.firstName} ${sp.student.lastName ?? ""}`.trim();
		unified.push({
			id: `SP-${sp.id}`,
			entryId: sp.id,
			date: dateKey,
			billingMonth: dateKey.slice(0, 7),
			feeBillingMonth: sp.fee.billingMonth ?? null,
			receiptNo: sp.receiptNo ?? null,
			category,
			categoryLabel: INCOME_CATEGORY_LABELS[category],
			sourceType: "STUDENT_PAYMENT",
			sourceOrStudent: `${studentName} (${sp.student.studentId})`,
			sourceLabel: null,
			title: sp.fee.title,
			paymentMethod: sp.paymentMethod,
			referenceNo: sp.trxId,
			notes: sp.remarks,
			amount: roundMoney(Number(sp.paidAmount)),
			recordedBy: sp.verifiedBy?.name ?? null,
		});
	}

	for (const ap of unlinkedAdmissionPayments) {
		const effectiveDate = ap.paidAt ?? ap.createdAt;
		const dateKey = toDhakaDateKey(effectiveDate);
		unified.push({
			id: `AP-${ap.id}`,
			entryId: ap.id,
			date: dateKey,
			billingMonth: dateKey.slice(0, 7),
			feeBillingMonth: null,
			receiptNo: null,
			category: "ADMISSION_FEE",
			categoryLabel: INCOME_CATEGORY_LABELS.ADMISSION_FEE,
			sourceType: "ADMISSION_PAYMENT",
			sourceOrStudent: `${ap.admission.studentName} (${ap.admission.applicationNo})`,
			sourceLabel: null,
			title: `Admission Fee — ${ap.admission.applicationNo}`,
			paymentMethod: ap.paymentMethod,
			referenceNo: ap.transactionId,
			notes: ap.remarks,
			amount: roundMoney(Number(ap.amount)),
			recordedBy: ap.receivedByUser?.name ?? null,
		});
	}

	for (const ie of manualEntries) {
		const dateKey = toDhakaDateKey(ie.incomeDate);
		unified.push({
			id: `MI-${ie.id}`,
			entryId: ie.id,
			date: dateKey,
			billingMonth: ie.billingMonth,
			feeBillingMonth: null,
			receiptNo: ie.receiptNo ?? null,
			category: "OTHER_INCOME",
			categoryLabel: INCOME_CATEGORY_LABELS.OTHER_INCOME,
			sourceType: "MANUAL_INCOME",
			sourceOrStudent: ie.sourceLabel,
			sourceLabel: ie.sourceLabel,
			title: ie.title,
			paymentMethod: ie.paymentMethod,
			referenceNo: ie.referenceNo,
			notes: ie.notes,
			amount: roundMoney(Number(ie.amount)),
			recordedBy: ie.recordedBy?.name ?? null,
		});
	}

	// Sort chronologically by date asc, then id asc
	unified.sort((a, b) => {
		const dateCmp = a.date.localeCompare(b.date);
		if (dateCmp !== 0) return dateCmp;
		return a.id.localeCompare(b.id);
	});

	return unified;
};

const aggregateByCategory = (rows: Omit<UnifiedIncomeRow, "serial">[]) => {
	const totals: Record<
		UnifiedIncomeCategory,
		{ amount: number; count: number }
	> = {
		MONTHLY_FEE: { amount: 0, count: 0 },
		ADMISSION_FEE: { amount: 0, count: 0 },
		OTHER_STUDENT_FEE: { amount: 0, count: 0 },
		OTHER_INCOME: { amount: 0, count: 0 },
	};

	for (const row of rows) {
		totals[row.category].amount = roundMoney(
			totals[row.category].amount + row.amount,
		);
		totals[row.category].count += 1;
	}

	const grandTotal = roundMoney(
		totals.MONTHLY_FEE.amount +
			totals.ADMISSION_FEE.amount +
			totals.OTHER_STUDENT_FEE.amount +
			totals.OTHER_INCOME.amount,
	);

	const byCategory = ALL_CATEGORIES.map((category) => {
		const amount = totals[category].amount;
		const count = totals[category].count;
		const percentage =
			grandTotal > 0 ? Math.round((amount / grandTotal) * 1000) / 10 : 0;
		return {
			category,
			label: INCOME_CATEGORY_LABELS[category],
			amount,
			count,
			percentage,
		};
	});

	return {
		monthlyFeeTotal: totals.MONTHLY_FEE.amount,
		admissionFeeTotal: totals.ADMISSION_FEE.amount,
		otherStudentFeeTotal: totals.OTHER_STUDENT_FEE.amount,
		otherIncomeTotal: totals.OTHER_INCOME.amount,
		grandTotal,
		byCategory,
	};
};

const filterRows = (
	rows: Omit<UnifiedIncomeRow, "serial">[],
	category: IncomeCategoryFilter = "ALL",
	search?: string,
): UnifiedIncomeRow[] => {
	const q = search?.trim().toLowerCase();
	return rows
		.filter((row) => {
			if (category !== "ALL" && row.category !== category) return false;
			if (!q) return true;
			return (
				row.sourceOrStudent.toLowerCase().includes(q) ||
				row.title.toLowerCase().includes(q) ||
				row.categoryLabel.toLowerCase().includes(q) ||
				(row.receiptNo?.toLowerCase().includes(q) ?? false) ||
				(row.referenceNo?.toLowerCase().includes(q) ?? false) ||
				(row.notes?.toLowerCase().includes(q) ?? false) ||
				(row.feeBillingMonth?.toLowerCase().includes(q) ?? false) ||
				row.paymentMethod.toLowerCase().includes(q) ||
				row.date.includes(q)
			);
		})
		.map((row, idx) => ({
			serial: idx + 1,
			...row,
		}));
};

const buildDailySeriesForKeys = (
	dateKeys: string[],
	rows: UnifiedIncomeRow[],
) => {
	const dailyMap = new Map<string, { totalAmount: number; count: number }>();
	for (const row of rows) {
		const bucket = dailyMap.get(row.date) ?? { totalAmount: 0, count: 0 };
		bucket.totalAmount = roundMoney(bucket.totalAmount + row.amount);
		bucket.count += 1;
		dailyMap.set(row.date, bucket);
	}

	const dailySeries = dateKeys.map((date) => {
		const bucket = dailyMap.get(date);
		const day = Number(date.slice(8, 10)) || 1;
		return {
			date,
			day,
			totalAmount: bucket?.totalAmount ?? 0,
			count: bucket?.count ?? 0,
		};
	});

	return {
		dailySeries,
		activeDaysCount: dailyMap.size,
	};
};

export const getIncomeSummary = async (
	schoolId: number,
	query: IncomeSummaryQuery,
) => {
	const billingMonth = query.billingMonth?.trim() || getCurrentDhakaMonth();
	const category: IncomeCategoryFilter = query.category ?? "ALL";
	const { rangeStart, rangeEnd, startKey, endKey, dateKeys } =
		resolveMonthDateRange(billingMonth, query.startDate, query.endDate);

	const allRows = await fetchUnifiedIncomeRows(schoolId, rangeStart, rangeEnd);
	const periodAggregates = aggregateByCategory(allRows);
	const rows = filterRows(allRows, category, query.search);
	const filteredAggregates = aggregateByCategory(rows);
	const { dailySeries, activeDaysCount } = buildDailySeriesForKeys(
		dateKeys,
		rows,
	);
	const hasActiveFilters = Boolean(
		category !== "ALL" ||
			query.search?.trim() ||
			query.startDate?.trim() ||
			query.endDate?.trim(),
	);

	return {
		billingMonth,
		category,
		startDate: query.startDate?.trim() || null,
		endDate: query.endDate?.trim() || null,
		effectiveStartDate: startKey,
		effectiveEndDate: endKey,
		hasActiveFilters,
		...periodAggregates,
		filteredTotal: filteredAggregates.grandTotal,
		filteredSummary: {
			...filteredAggregates,
			entryCount: rows.length,
		},
		entryCount: rows.length,
		activeDaysCount,
		dailySeries,
		rows,
	};
};

export const getIncomeMonthlyChart = async (
	schoolId: number,
	query: IncomeChartQuery,
) => {
	const billingMonth = query.billingMonth.trim();
	const category: IncomeCategoryFilter = query.category ?? "ALL";
	const { rangeStart, rangeEnd, startKey, endKey, dateKeys } =
		resolveMonthDateRange(billingMonth, query.startDate, query.endDate);

	const [school, allRows] = await Promise.all([
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
		fetchUnifiedIncomeRows(schoolId, rangeStart, rangeEnd),
	]);

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const periodAggregates = aggregateByCategory(allRows);
	const rows = filterRows(allRows, category, query.search);
	const filteredAggregates = aggregateByCategory(rows);
	const { dailySeries, activeDaysCount } = buildDailySeriesForKeys(
		dateKeys,
		rows,
	);
	const hasActiveFilters = Boolean(
		category !== "ALL" ||
			query.search?.trim() ||
			query.startDate?.trim() ||
			query.endDate?.trim(),
	);

	return {
		school,
		billingMonth,
		category,
		startDate: query.startDate?.trim() || null,
		endDate: query.endDate?.trim() || null,
		effectiveStartDate: startKey,
		effectiveEndDate: endKey,
		hasActiveFilters,
		...periodAggregates,
		displayedTotal: filteredAggregates.grandTotal,
		filteredTotal: filteredAggregates.grandTotal,
		filteredSummary: {
			...filteredAggregates,
			entryCount: rows.length,
		},
		entryCount: rows.length,
		activeDaysCount,
		dailySeries,
		rows,
	};
};
