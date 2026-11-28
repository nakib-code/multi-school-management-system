import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CustomExpenseFieldType,
	Prisma,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import {
	generateUniqueFieldKey,
	getCustomExpenseMonthlyChart,
	normalizeEntryDate,
	sanitizeAndValidateFieldValues,
} from "../service.js";
import { createEntrySchema, createSheetSchema } from "../validation.js";

describe("Custom Expense Field Key & Date Normalization", () => {
	it("generates safe unique keys for Bangla and duplicate ASCII labels", () => {
		const used = new Set<string>();
		assert.equal(generateUniqueFieldKey("বাজার বিবরণ", used), "col_1");
		assert.equal(generateUniqueFieldKey("দোকানের নাম", used), "col_2");
		assert.equal(generateUniqueFieldKey("Item Name", used), "item_name");
		assert.equal(generateUniqueFieldKey("Item Name", used), "item_name_2");
		assert.equal(generateUniqueFieldKey("constructor", used), "col_3");
		assert.equal(generateUniqueFieldKey("__proto__", used), "proto");
	});

	it("normalizes entryDate and auto-derives YYYY-MM billingMonth", () => {
		const parsed = normalizeEntryDate("2026-11-28");
		assert.equal(parsed.dateKey, "2026-11-28");
		assert.equal(parsed.billingMonth, "2026-11");

		const defaulted = normalizeEntryDate(
			undefined,
			new Date("2026-05-14T19:30:00Z"),
		);
		// 19:30 UTC is 01:30 next day in Asia/Dhaka (+06:00) -> 2026-05-15
		assert.equal(defaulted.dateKey, "2026-05-15");
		assert.equal(defaulted.billingMonth, "2026-05");
	});

	it("validates amount caps and dynamic field values strictly", () => {
		const tooLarge = createEntrySchema.safeParse({
			params: { schoolId: 1, sheetId: 2 },
			body: { amount: 100000000 },
		});
		assert.equal(tooLarge.success, false);

		const validSheet = createSheetSchema.safeParse({
			params: { schoolId: 1 },
			body: {
				name: "বাজার বিল",
				fields: [
					{ label: "পণ্যের নাম", fieldType: "TEXT", isRequired: true },
					{ label: "পরিমাণ", fieldType: "NUMBER", isRequired: false },
				],
			},
		});
		assert.equal(validSheet.success, true);

		const fields = [
			{
				label: "পণ্যের নাম",
				fieldKey: "col_1",
				fieldType: CustomExpenseFieldType.TEXT,
				isRequired: true,
			},
			{
				label: "পরিমাণ",
				fieldKey: "col_2",
				fieldType: CustomExpenseFieldType.NUMBER,
				isRequired: false,
			},
			{
				label: "বিলের তারিখ",
				fieldKey: "col_3",
				fieldType: CustomExpenseFieldType.DATE,
				isRequired: false,
			},
		];

		const clean = sanitizeAndValidateFieldValues(fields, {
			col_1: "চাল ও ডাল",
			col_2: "25.5",
			col_3: "2026-11-20",
			extraUnknown: "ignored",
			__proto__: "bad",
		});
		assert.deepEqual(clean, {
			col_1: "চাল ও ডাল",
			col_2: 25.5,
			col_3: "2026-11-20",
		});

		assert.throws(
			() => sanitizeAndValidateFieldValues(fields, { col_2: "10" }),
			/is required/,
		);
	});
});

describe("Custom Expense Monthly Chart Aggregation & School Isolation", () => {
	it("scopes chart queries by schoolId and aggregates dailySeries & totals accurately", async () => {
		const originalSchoolFind = prisma.school.findUnique;
		const originalSheetFind = prisma.customExpenseSheet.findFirst;
		const originalEntryFind = prisma.customExpenseEntry.findMany;

		let capturedEntryWhere: unknown = null;

		try {
			(prisma.school as unknown as { findUnique: unknown }).findUnique =
				async () => ({
					id: 7,
					name: "Darul Uloom Madrasa",
					code: "DUM-01",
					logo: null,
					address: "Dhaka",
					phone: "01700000000",
					email: "info@dum.edu.bd",
				});

			(
				prisma.customExpenseSheet as unknown as { findFirst: unknown }
			).findFirst = async (args: {
				where: { schoolId: number; id: number };
			}) => {
				assert.equal(args.where.schoolId, 7);
				return {
					id: 12,
					schoolId: 7,
					name: "বাজার বিল",
					description: "দৈনিক বাজার খরচ",
					isActive: true,
					createdById: 1,
					createdAt: new Date("2026-11-01T00:00:00Z"),
					updatedAt: new Date("2026-11-01T00:00:00Z"),
					fields: [
						{
							id: 101,
							sheetId: 12,
							schoolId: 7,
							label: "বিবরণ",
							fieldKey: "col_1",
							fieldType: CustomExpenseFieldType.TEXT,
							isRequired: true,
							sortOrder: 0,
						},
					],
					_count: { entries: 2 },
				};
			};

			(prisma.customExpenseEntry as unknown as { findMany: unknown }).findMany =
				async (args: { where: unknown }) => {
					capturedEntryWhere = args.where;
					return [
						{
							id: 501,
							sheetId: 12,
							schoolId: 7,
							entryDate: new Date(Date.UTC(2026, 10, 5, 12, 0, 0)),
							billingMonth: "2026-11",
							amount: new Prisma.Decimal("1250.50"),
							fieldValues: { col_1: "মাছ ও সবজি" },
							recordedBy: { id: 1, name: "Admin", role: "ADMIN" },
						},
						{
							id: 502,
							sheetId: 12,
							schoolId: 7,
							entryDate: new Date(Date.UTC(2026, 10, 5, 12, 0, 0)),
							billingMonth: "2026-11",
							amount: new Prisma.Decimal("749.50"),
							fieldValues: { col_1: "মসলা" },
							recordedBy: { id: 1, name: "Admin", role: "ADMIN" },
						},
					];
				};

			const chart = await getCustomExpenseMonthlyChart(7, 12, {
				billingMonth: "2026-11",
			});

			assert.deepEqual(capturedEntryWhere, {
				schoolId: 7,
				sheetId: 12,
				billingMonth: "2026-11",
			});
			assert.equal(chart.totalAmount, 2000);
			assert.equal(chart.entryCount, 2);
			assert.equal(chart.activeDaysCount, 1);
			assert.equal(chart.dailySeries.length, 30); // November has 30 days
			const day5 = chart.dailySeries.find((d) => d.date === "2026-11-05");
			assert.deepEqual(day5, {
				date: "2026-11-05",
				day: 5,
				totalAmount: 2000,
				count: 2,
			});
			assert.equal(chart.rows[0]?.serial, 1);
			assert.equal(chart.rows[0]?.fieldValues.col_1, "মাছ ও সবজি");
			assert.equal(chart.rows[1]?.serial, 2);
		} finally {
			prisma.school.findUnique = originalSchoolFind;
			prisma.customExpenseSheet.findFirst = originalSheetFind;
			prisma.customExpenseEntry.findMany = originalEntryFind;
		}
	});
});
