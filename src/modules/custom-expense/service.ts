import {
	CustomExpenseFieldType,
	PaymentMethod,
	Prisma,
	SequenceDocumentType,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	getCurrentDhakaMonth,
	getTodayDhakaDateKey,
	resolveMonthOrCustomDateRange,
	roundMoney,
} from "../../utils/dhakaDate.js";
import { generateNextDocumentNumber } from "../../utils/documentSequence.js";
import type {
	CreateCustomExpenseEntryInput,
	CreateCustomExpenseSheetInput,
	CustomExpenseChartQuery,
	CustomExpenseEntriesFilterQuery,
	UpdateCustomExpenseEntryInput,
	UpdateCustomExpenseSheetFieldsInput,
} from "./interface.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ISO_DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Returns today's calendar date (YYYY-MM-DD) in Asia/Dhaka so Bangladeshi
 * schools get accurate local dates even around midnight UTC.
 */
export const getTodayDhakaDateString = (now: Date = new Date()): string =>
	getTodayDhakaDateKey(now);

/**
 * Parses an entry date string (or defaults to today in Asia/Dhaka) into a
 * timezone-safe UTC noon Date and its derived YYYY-MM billingMonth.
 */
export const normalizeEntryDate = (
	rawDate?: string,
	now: Date = new Date(),
): { entryDate: Date; dateKey: string; billingMonth: string } => {
	const trimmed = rawDate?.trim();
	const effective = trimmed || getTodayDhakaDateString(now);

	const isoMatch = ISO_DATE_RE.exec(effective);
	if (isoMatch) {
		const year = Number(isoMatch[1]);
		const month = Number(isoMatch[2]);
		const day = Number(isoMatch[3]);
		const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
		if (
			dt.getUTCFullYear() !== year ||
			dt.getUTCMonth() !== month - 1 ||
			dt.getUTCDate() !== day
		) {
			throw new AppError(400, "Invalid entry date");
		}
		const dateKey = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
		return {
			entryDate: dt,
			dateKey,
			billingMonth: `${isoMatch[1]}-${isoMatch[2]}`,
		};
	}

	const parsed = new Date(effective);
	if (Number.isNaN(parsed.getTime())) {
		throw new AppError(400, "Invalid entry date");
	}
	const year = parsed.getUTCFullYear();
	const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
	const day = String(parsed.getUTCDate()).padStart(2, "0");
	const dateKey = `${year}-${month}-${day}`;
	return {
		entryDate: new Date(
			Date.UTC(year, parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0),
		),
		dateKey,
		billingMonth: `${year}-${month}`,
	};
};

export const formatDateKey = (date: Date): string => {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

export const assertNoDuplicateFieldLabels = (
	fields: Array<{ label: string }>,
) => {
	const seen = new Set<string>();
	for (const field of fields) {
		const normalized = field.label.trim().toLowerCase();
		if (!normalized) {
			throw new AppError(400, "Column label cannot be empty");
		}
		if (seen.has(normalized)) {
			throw new AppError(
				400,
				`Duplicate column label "${field.label.trim()}" is not allowed in the same sheet`,
			);
		}
		seen.add(normalized);
	}
};

/**
 * Generates a clean unique fieldKey supporting both ASCII and Unicode (e.g. Bangla) labels.
 */
export const generateUniqueFieldKey = (
	label: string,
	usedKeys: Set<string>,
	preferredKey?: string,
): string => {
	const rawPreferred = preferredKey?.trim().toLowerCase();
	if (
		rawPreferred &&
		/^[a-z][a-z0-9_]{0,49}$/.test(rawPreferred) &&
		!FORBIDDEN_KEYS.has(rawPreferred) &&
		!usedKeys.has(rawPreferred)
	) {
		usedKeys.add(rawPreferred);
		return rawPreferred;
	}

	const asciiBase = label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 36);

	const base =
		asciiBase && /^[a-z]/.test(asciiBase) && !FORBIDDEN_KEYS.has(asciiBase)
			? asciiBase
			: "col";

	if (base !== "col" && !usedKeys.has(base)) {
		usedKeys.add(base);
		return base;
	}

	let suffix = base === "col" ? 1 : 2;
	while (usedKeys.has(`${base}_${suffix}`)) {
		suffix += 1;
	}
	const candidate = `${base}_${suffix}`;
	usedKeys.add(candidate);
	return candidate;
};

interface FieldSpec {
	label: string;
	fieldKey: string;
	fieldType: CustomExpenseFieldType;
	isRequired: boolean;
}

/**
 * Safely parses a finite number without returning NaN.
 */
export const parseSafeFiniteNumber = (val: unknown): number | null => {
	if (typeof val === "number") {
		return Number.isFinite(val) ? val : null;
	}
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (!trimmed) return null;
		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

/**
 * Validates and normalizes dynamic fieldValues against a sheet's field definitions.
 * Only known fieldKeys are persisted; unknown/unsafe keys are discarded.
 */
export const sanitizeAndValidateFieldValues = (
	fields: FieldSpec[],
	rawValues: Record<string, unknown> | undefined,
): Record<string, string | number | null> => {
	const source = rawValues ?? {};
	const normalized: Record<string, string | number | null> = {};

	for (const field of fields) {
		if (FORBIDDEN_KEYS.has(field.fieldKey)) continue;
		const hasOwn = Object.hasOwn(source, field.fieldKey);
		const rawVal = hasOwn ? source[field.fieldKey] : undefined;

		if (
			rawVal === undefined ||
			rawVal === null ||
			(typeof rawVal === "string" && rawVal.trim() === "")
		) {
			if (field.isRequired) {
				throw new AppError(400, `"${field.label}" is required`);
			}
			normalized[field.fieldKey] = null;
			continue;
		}

		if (field.fieldType === CustomExpenseFieldType.NUMBER) {
			const num = parseSafeFiniteNumber(rawVal);
			if (num === null) {
				throw new AppError(400, `"${field.label}" must be a valid number`);
			}
			normalized[field.fieldKey] = num;
			continue;
		}

		if (field.fieldType === CustomExpenseFieldType.DATE) {
			const strVal = String(rawVal).trim();
			const { dateKey } = normalizeEntryDate(strVal);
			normalized[field.fieldKey] = dateKey;
			continue;
		}

		// TEXT
		const text = String(rawVal).trim();
		if (text.length > 500) {
			throw new AppError(
				400,
				`"${field.label}" must be 500 characters or fewer`,
			);
		}
		normalized[field.fieldKey] = text;
	}

	return normalized;
};

const sheetInclude = {
	fields: {
		orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
	},
	_count: {
		select: { entries: true },
	},
};

const assertSchoolSheet = async (schoolId: number, sheetId: number) => {
	const sheet = await prisma.customExpenseSheet.findFirst({
		where: { id: sheetId, schoolId },
		include: sheetInclude,
	});
	if (!sheet) {
		throw new AppError(404, "Custom expense sheet not found");
	}
	return sheet;
};

const mapFieldValuesForDisplay = (
	fields: FieldSpec[],
	stored: Prisma.JsonValue,
): Record<string, string | number | null> => {
	const obj =
		stored && typeof stored === "object" && !Array.isArray(stored)
			? (stored as Record<string, unknown>)
			: {};
	const mapped: Record<string, string | number | null> = {};
	for (const field of fields) {
		const val = obj[field.fieldKey];
		if (val === undefined || val === null || val === "") {
			mapped[field.fieldKey] = null;
		} else if (typeof val === "number") {
			mapped[field.fieldKey] = Number.isFinite(val) ? val : null;
		} else if (typeof val === "string") {
			mapped[field.fieldKey] = val;
		} else {
			mapped[field.fieldKey] = String(val);
		}
	}
	return mapped;
};

export const listCustomExpenseSheets = async (
	schoolId: number,
	includeInactive = false,
	billingMonth?: string,
) => {
	const targetMonth = billingMonth?.trim() || getCurrentDhakaMonth();
	const [sheets, monthGroups] = await Promise.all([
		prisma.customExpenseSheet.findMany({
			where: {
				schoolId,
				...(includeInactive ? {} : { isActive: true }),
			},
			include: sheetInclude,
			orderBy: [{ isActive: "desc" }, { createdAt: "desc" }, { id: "desc" }],
		}),
		prisma.customExpenseEntry.groupBy({
			by: ["sheetId"],
			where: {
				schoolId,
				billingMonth: targetMonth,
			},
			_count: { _all: true },
			_sum: { amount: true },
		}),
	]);

	const monthStatsMap = new Map(
		monthGroups.map((g) => [
			g.sheetId,
			{
				monthEntryCount: g._count._all,
				monthTotalAmount: roundMoney(Number(g._sum.amount ?? 0)),
			},
		]),
	);

	return sheets.map((sheet) => {
		const stats = monthStatsMap.get(sheet.id);
		return {
			...sheet,
			billingMonth: targetMonth,
			monthEntryCount: stats?.monthEntryCount ?? 0,
			monthTotalAmount: stats?.monthTotalAmount ?? 0,
		};
	});
};

export const createCustomExpenseSheet = async (
	schoolId: number,
	createdById: number,
	payload: CreateCustomExpenseSheetInput,
) => {
	const name = payload.name.trim();
	const description = payload.description?.trim() || null;
	const rawFields = payload.fields ?? [];

	assertNoDuplicateFieldLabels(rawFields);

	const usedKeys = new Set<string>();
	const fieldsToCreate = rawFields.map((f, index) => ({
		schoolId,
		label: f.label.trim(),
		fieldKey: generateUniqueFieldKey(f.label, usedKeys, f.fieldKey),
		fieldType: f.fieldType ?? CustomExpenseFieldType.TEXT,
		isRequired: Boolean(f.isRequired),
		sortOrder: f.sortOrder ?? index,
	}));

	try {
		return await prisma.customExpenseSheet.create({
			data: {
				schoolId,
				name,
				description,
				createdById,
				...(fieldsToCreate.length > 0
					? { fields: { create: fieldsToCreate } }
					: {}),
			},
			include: sheetInclude,
		});
	} catch (err) {
		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === "P2002"
		) {
			throw new AppError(
				409,
				`A sheet named "${name}" already exists for this institution`,
			);
		}
		throw err;
	}
};

export const updateCustomExpenseSheetFields = async (
	schoolId: number,
	sheetId: number,
	payload: UpdateCustomExpenseSheetFieldsInput,
) => {
	const existing = await assertSchoolSheet(schoolId, sheetId);
	if (!existing.isActive) {
		throw new AppError(
			400,
			"Cannot edit columns on an archived sheet. Restore the sheet first.",
		);
	}

	assertNoDuplicateFieldLabels(payload.fields);

	const previous = {
		name: existing.name,
		fieldLabels: existing.fields.map((f) => f.label),
	};

	const existingById = new Map(existing.fields.map((f) => [f.id, f]));
	const keptIds = new Set<number>();
	const usedKeys = new Set<string>();

	// Reserve fieldKeys of existing fields being retained so new fields never collide
	for (const item of payload.fields) {
		if (item.id !== undefined) {
			const match = existingById.get(item.id);
			if (!match) {
				throw new AppError(
					400,
					`Custom field #${item.id} does not belong to this sheet`,
				);
			}
			keptIds.add(match.id);
			usedKeys.add(match.fieldKey);
		}
	}

	const fieldsToDeleteIds = existing.fields
		.filter((f) => !keptIds.has(f.id))
		.map((f) => f.id);

	try {
		const updated = await prisma.$transaction(async (tx) => {
			if (payload.name !== undefined || payload.description !== undefined) {
				await tx.customExpenseSheet.update({
					where: { id: sheetId },
					data: {
						...(payload.name !== undefined
							? { name: payload.name.trim() }
							: {}),
						...(payload.description !== undefined
							? { description: payload.description?.trim() || null }
							: {}),
					},
				});
			}

			if (fieldsToDeleteIds.length > 0) {
				await tx.customExpenseField.deleteMany({
					where: {
						sheetId,
						schoolId,
						id: { in: fieldsToDeleteIds },
					},
				});
			}

			for (let idx = 0; idx < payload.fields.length; idx += 1) {
				const item = payload.fields[idx];
				if (!item) continue;
				const sortOrder = item.sortOrder ?? idx;
				if (item.id !== undefined) {
					await tx.customExpenseField.update({
						where: { id: item.id },
						data: {
							label: item.label.trim(),
							fieldType: item.fieldType,
							isRequired: Boolean(item.isRequired),
							sortOrder,
						},
					});
				} else {
					const fieldKey = generateUniqueFieldKey(
						item.label,
						usedKeys,
						item.fieldKey,
					);
					await tx.customExpenseField.create({
						data: {
							sheetId,
							schoolId,
							label: item.label.trim(),
							fieldKey,
							fieldType: item.fieldType,
							isRequired: Boolean(item.isRequired),
							sortOrder,
						},
					});
				}
			}

			return tx.customExpenseSheet.findFirstOrThrow({
				where: { id: sheetId, schoolId },
				include: sheetInclude,
			});
		});

		return { sheet: updated, previous };
	} catch (err) {
		if (
			err instanceof Prisma.PrismaClientKnownRequestError &&
			err.code === "P2002"
		) {
			throw new AppError(
				409,
				"A sheet with this name or duplicate column key already exists",
			);
		}
		throw err;
	}
};

export const deleteOrArchiveCustomExpenseSheet = async (
	schoolId: number,
	sheetId: number,
	archive = false,
) => {
	const existing = await assertSchoolSheet(schoolId, sheetId);

	if (archive) {
		await prisma.customExpenseSheet.update({
			where: { id: existing.id },
			data: { isActive: false },
		});
		return {
			id: existing.id,
			name: existing.name,
			entryCount: existing._count.entries,
			archived: true,
		};
	}

	await prisma.customExpenseSheet.delete({
		where: { id: existing.id },
	});
	return {
		id: existing.id,
		name: existing.name,
		entryCount: existing._count.entries,
		archived: false,
	};
};

export const restoreCustomExpenseSheet = async (
	schoolId: number,
	sheetId: number,
) => {
	const existing = await assertSchoolSheet(schoolId, sheetId);
	if (existing.isActive) {
		return existing;
	}
	return prisma.customExpenseSheet.update({
		where: { id: existing.id },
		data: { isActive: true },
		include: sheetInclude,
	});
};

export const listCustomExpenseEntries = async (
	schoolId: number,
	sheetId: number,
	query: CustomExpenseEntriesFilterQuery,
) => {
	const sheet = await assertSchoolSheet(schoolId, sheetId);

	let dateWhere: Prisma.DateTimeFilter | undefined;
	if (query.startDate || query.endDate) {
		const monthFallback = query.billingMonth?.trim() || getCurrentDhakaMonth();
		const { rangeStart, rangeEnd } = resolveMonthOrCustomDateRange(
			monthFallback,
			query.startDate,
			query.endDate,
		);
		dateWhere = { gte: rangeStart, lte: rangeEnd };
	}

	const entries = await prisma.customExpenseEntry.findMany({
		where: {
			schoolId,
			sheetId,
			...(dateWhere
				? { entryDate: dateWhere }
				: query.billingMonth
					? { billingMonth: query.billingMonth }
					: {}),
		},
		include: {
			recordedBy: { select: { id: true, name: true, role: true } },
		},
		orderBy: [{ entryDate: "desc" }, { id: "desc" }],
	});

	const q = query.search?.trim().toLowerCase();
	const formatted = entries
		.map((entry) => ({
			id: entry.id,
			sheetId: entry.sheetId,
			schoolId: entry.schoolId,
			entryDate: formatDateKey(entry.entryDate),
			billingMonth: entry.billingMonth,
			amount: roundMoney(Number(entry.amount)),
			paymentMethod: entry.paymentMethod,
			voucherNo: entry.voucherNo,
			attachmentUrl: entry.attachmentUrl,
			fieldValues: mapFieldValuesForDisplay(sheet.fields, entry.fieldValues),
			recordedBy: entry.recordedBy,
			createdAt: entry.createdAt,
			updatedAt: entry.updatedAt,
		}))
		.filter((entry) => {
			if (!q) return true;
			if (entry.entryDate.includes(q)) return true;
			if (String(entry.amount).includes(q)) return true;
			if (entry.voucherNo?.toLowerCase().includes(q)) return true;
			if (entry.paymentMethod.toLowerCase().includes(q)) return true;
			return Object.values(entry.fieldValues).some(
				(val) => val !== null && String(val).toLowerCase().includes(q),
			);
		});

	return {
		sheet,
		entries: formatted,
		totalAmount: roundMoney(
			formatted.reduce((sum, item) => sum + item.amount, 0),
		),
		entryCount: formatted.length,
	};
};

export const createCustomExpenseEntry = async (
	schoolId: number,
	sheetId: number,
	recordedById: number,
	payload: CreateCustomExpenseEntryInput,
) => {
	const sheet = await assertSchoolSheet(schoolId, sheetId);
	if (!sheet.isActive) {
		throw new AppError(400, "Cannot add entries to an archived sheet");
	}

	const { entryDate, billingMonth } = normalizeEntryDate(payload.entryDate);
	const sanitizedValues = sanitizeAndValidateFieldValues(
		sheet.fields,
		payload.fieldValues,
	);

	const created = await prisma.$transaction(async (tx) => {
		const voucherNo = await generateNextDocumentNumber(
			tx,
			schoolId,
			SequenceDocumentType.EXPENSE_VOUCHER,
			entryDate,
		);

		return tx.customExpenseEntry.create({
			data: {
				sheetId,
				schoolId,
				entryDate,
				billingMonth,
				amount: new Prisma.Decimal(roundMoney(payload.amount).toFixed(2)),
				paymentMethod: payload.paymentMethod ?? PaymentMethod.CASH,
				voucherNo,
				attachmentUrl: payload.attachmentUrl?.trim() || null,
				fieldValues: sanitizedValues,
				recordedById,
			},
			include: {
				recordedBy: { select: { id: true, name: true, role: true } },
			},
		});
	});

	return {
		id: created.id,
		sheetId: created.sheetId,
		schoolId: created.schoolId,
		entryDate: formatDateKey(created.entryDate),
		billingMonth: created.billingMonth,
		amount: roundMoney(Number(created.amount)),
		paymentMethod: created.paymentMethod,
		voucherNo: created.voucherNo,
		attachmentUrl: created.attachmentUrl,
		fieldValues: mapFieldValuesForDisplay(sheet.fields, created.fieldValues),
		recordedBy: created.recordedBy,
		createdAt: created.createdAt,
		updatedAt: created.updatedAt,
	};
};

export const updateCustomExpenseEntry = async (
	schoolId: number,
	sheetId: number,
	entryId: number,
	payload: UpdateCustomExpenseEntryInput,
) => {
	const sheet = await assertSchoolSheet(schoolId, sheetId);
	if (!sheet.isActive) {
		throw new AppError(
			400,
			"Cannot edit entries on an archived sheet. Restore the sheet first.",
		);
	}
	const existing = await prisma.customExpenseEntry.findFirst({
		where: { id: entryId, sheetId, schoolId },
	});
	if (!existing) {
		throw new AppError(404, "Expense entry not found");
	}

	const previous = {
		entryDate: formatDateKey(existing.entryDate),
		billingMonth: existing.billingMonth,
		amount: roundMoney(Number(existing.amount)),
		paymentMethod: existing.paymentMethod,
		voucherNo: existing.voucherNo,
	};

	const dateUpdate =
		payload.entryDate !== undefined
			? normalizeEntryDate(payload.entryDate)
			: null;

	const currentValues = mapFieldValuesForDisplay(
		sheet.fields,
		existing.fieldValues,
	);
	const mergedRaw =
		payload.fieldValues !== undefined
			? { ...currentValues, ...payload.fieldValues }
			: currentValues;
	const sanitizedValues =
		payload.fieldValues !== undefined
			? sanitizeAndValidateFieldValues(sheet.fields, mergedRaw)
			: undefined;

	const updated = await prisma.customExpenseEntry.update({
		where: { id: existing.id },
		data: {
			...(dateUpdate
				? {
						entryDate: dateUpdate.entryDate,
						billingMonth: dateUpdate.billingMonth,
					}
				: {}),
			...(payload.amount !== undefined
				? {
						amount: new Prisma.Decimal(roundMoney(payload.amount).toFixed(2)),
					}
				: {}),
			...(payload.paymentMethod !== undefined
				? { paymentMethod: payload.paymentMethod }
				: {}),
			...(payload.attachmentUrl !== undefined
				? { attachmentUrl: payload.attachmentUrl?.trim() || null }
				: {}),
			...(sanitizedValues !== undefined
				? { fieldValues: sanitizedValues }
				: {}),
		},
		include: {
			recordedBy: { select: { id: true, name: true, role: true } },
		},
	});

	return {
		id: updated.id,
		sheetId: updated.sheetId,
		schoolId: updated.schoolId,
		entryDate: formatDateKey(updated.entryDate),
		billingMonth: updated.billingMonth,
		amount: roundMoney(Number(updated.amount)),
		paymentMethod: updated.paymentMethod,
		voucherNo: updated.voucherNo,
		attachmentUrl: updated.attachmentUrl,
		fieldValues: mapFieldValuesForDisplay(sheet.fields, updated.fieldValues),
		recordedBy: updated.recordedBy,
		createdAt: updated.createdAt,
		updatedAt: updated.updatedAt,
		previous,
	};
};

export const deleteCustomExpenseEntry = async (
	schoolId: number,
	sheetId: number,
	entryId: number,
) => {
	const sheet = await assertSchoolSheet(schoolId, sheetId);
	if (!sheet.isActive) {
		throw new AppError(
			400,
			"Cannot delete entries from an archived sheet. Restore the sheet first.",
		);
	}
	const existing = await prisma.customExpenseEntry.findFirst({
		where: { id: entryId, sheetId, schoolId },
		select: {
			id: true,
			amount: true,
			billingMonth: true,
			entryDate: true,
			voucherNo: true,
			paymentMethod: true,
		},
	});
	if (!existing) {
		throw new AppError(404, "Expense entry not found");
	}

	await prisma.customExpenseEntry.delete({
		where: { id: existing.id },
	});

	return {
		id: existing.id,
		amount: roundMoney(Number(existing.amount)),
		billingMonth: existing.billingMonth,
		entryDate: formatDateKey(existing.entryDate),
		voucherNo: existing.voucherNo,
		paymentMethod: existing.paymentMethod,
	};
};

export const getCustomExpenseMonthlyChart = async (
	schoolId: number,
	sheetId: number,
	query: CustomExpenseChartQuery,
) => {
	const hasCustomRange = Boolean(
		query.startDate?.trim() || query.endDate?.trim(),
	);
	const { rangeStart, rangeEnd, startKey, endKey, dateKeys } =
		resolveMonthOrCustomDateRange(
			query.billingMonth,
			query.startDate,
			query.endDate,
		);

	const [school, sheet, entries] = await Promise.all([
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
		assertSchoolSheet(schoolId, sheetId),
		prisma.customExpenseEntry.findMany({
			where: hasCustomRange
				? {
						schoolId,
						sheetId,
						entryDate: { gte: rangeStart, lte: rangeEnd },
					}
				: {
						schoolId,
						sheetId,
						billingMonth: query.billingMonth,
					},
			include: {
				recordedBy: { select: { id: true, name: true, role: true } },
			},
			orderBy: [{ entryDate: "asc" }, { id: "asc" }],
		}),
	]);

	if (!school) {
		throw new AppError(404, "School not found");
	}

	const q = query.search?.trim().toLowerCase();
	const allMapped = entries.map((entry) => ({
		id: entry.id,
		entryDate: formatDateKey(entry.entryDate),
		billingMonth: entry.billingMonth,
		amount: roundMoney(Number(entry.amount)),
		paymentMethod: entry.paymentMethod ?? PaymentMethod.CASH,
		voucherNo: entry.voucherNo ?? null,
		attachmentUrl: entry.attachmentUrl ?? null,
		fieldValues: mapFieldValuesForDisplay(sheet.fields, entry.fieldValues),
		recordedBy: entry.recordedBy,
	}));

	const unfilteredTotalAmount = roundMoney(
		allMapped.reduce((sum, item) => sum + item.amount, 0),
	);

	const filteredEntries = allMapped.filter((entry) => {
		if (!q) return true;
		if (entry.entryDate.includes(q)) return true;
		if (String(entry.amount).includes(q)) return true;
		if (entry.voucherNo?.toLowerCase().includes(q)) return true;
		if (entry.paymentMethod.toLowerCase().includes(q)) return true;
		if (entry.recordedBy?.name?.toLowerCase().includes(q)) return true;
		return Object.values(entry.fieldValues).some(
			(val) => val !== null && String(val).toLowerCase().includes(q),
		);
	});

	const dailyMap = new Map<string, { totalAmount: number; count: number }>();
	const numericColumnTotals: Record<string, number> = {};
	for (const field of sheet.fields) {
		if (field.fieldType === CustomExpenseFieldType.NUMBER) {
			numericColumnTotals[field.fieldKey] = 0;
		}
	}

	let totalAmount = 0;

	const rows = filteredEntries.map((entry, idx) => {
		totalAmount += entry.amount;

		const bucket = dailyMap.get(entry.entryDate) ?? {
			totalAmount: 0,
			count: 0,
		};
		bucket.totalAmount = roundMoney(bucket.totalAmount + entry.amount);
		bucket.count += 1;
		dailyMap.set(entry.entryDate, bucket);

		for (const field of sheet.fields) {
			if (field.fieldType === CustomExpenseFieldType.NUMBER) {
				const parsed = parseSafeFiniteNumber(entry.fieldValues[field.fieldKey]);
				if (parsed !== null) {
					numericColumnTotals[field.fieldKey] = roundMoney(
						(numericColumnTotals[field.fieldKey] ?? 0) + parsed,
					);
				}
			}
		}

		return {
			serial: idx + 1,
			...entry,
		};
	});

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
		school,
		sheet,
		billingMonth: query.billingMonth,
		startDate: query.startDate?.trim() || null,
		endDate: query.endDate?.trim() || null,
		effectiveStartDate: startKey,
		effectiveEndDate: endKey,
		hasActiveFilters: Boolean(q || hasCustomRange),
		unfilteredTotalAmount,
		unfilteredEntryCount: allMapped.length,
		totalAmount: roundMoney(totalAmount),
		entryCount: rows.length,
		activeDaysCount: dailyMap.size,
		numericColumnTotals,
		dailySeries,
		rows,
	};
};
