import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CustomExpenseFieldType,
	PaymentMethod,
	Prisma,
	UserRole,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { customExpenseRoutes } from "../route.js";
import {
	assertNoDuplicateFieldLabels,
	createCustomExpenseEntry,
	generateUniqueFieldKey,
	getCustomExpenseMonthlyChart,
	normalizeEntryDate,
	parseSafeFiniteNumber,
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

	it("accepts only http/https protocols for attachmentUrl and rejects javascript/data/ftp schemes", () => {
		const validHttps = createEntrySchema.safeParse({
			params: { schoolId: 1, sheetId: 2 },
			body: {
				amount: 500,
				attachmentUrl: "https://res.cloudinary.com/demo/image/upload/bill.jpg",
			},
		});
		assert.equal(validHttps.success, true);

		const validHttp = createEntrySchema.safeParse({
			params: { schoolId: 1, sheetId: 2 },
			body: {
				amount: 500,
				attachmentUrl: "http://localhost:3000/uploads/bill.pdf",
			},
		});
		assert.equal(validHttp.success, true);

		for (const badUrl of [
			"javascript:alert(1)",
			"data:text/html,<script>alert(1)</script>",
			"ftp://example.com/bill.pdf",
			"file:///etc/passwd",
		]) {
			const res = createEntrySchema.safeParse({
				params: { schoolId: 1, sheetId: 2 },
				body: { amount: 500, attachmentUrl: badUrl },
			});
			assert.equal(res.success, false, `Expected ${badUrl} to be rejected`);
		}
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
						{
							id: 102,
							sheetId: 12,
							schoolId: 7,
							label: "কেজি",
							fieldKey: "col_2",
							fieldType: CustomExpenseFieldType.NUMBER,
							isRequired: false,
							sortOrder: 1,
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
							paymentMethod: PaymentMethod.CASH,
							voucherNo: "VCH-2026-0001",
							attachmentUrl: null,
							fieldValues: { col_1: "মাছ ও সবজি", col_2: 10.5 },
							recordedBy: { id: 1, name: "Admin", role: "ADMIN" },
						},
						{
							id: 502,
							sheetId: 12,
							schoolId: 7,
							entryDate: new Date(Date.UTC(2026, 10, 5, 12, 0, 0)),
							billingMonth: "2026-11",
							amount: new Prisma.Decimal("749.50"),
							paymentMethod: PaymentMethod.CASH,
							voucherNo: "VCH-2026-0002",
							attachmentUrl: null,
							fieldValues: { col_1: "মসলা", col_2: "not-a-number" },
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
			assert.equal(chart.numericColumnTotals.col_2, 10.5);
			const day5 = chart.dailySeries.find((d) => d.date === "2026-11-05");
			assert.deepEqual(day5, {
				date: "2026-11-05",
				day: 5,
				totalAmount: 2000,
				count: 2,
			});
			assert.equal(chart.rows[0]?.serial, 1);
			assert.equal(chart.rows[0]?.fieldValues.col_1, "মাছ ও সবজি");
			assert.equal(chart.rows[0]?.voucherNo, "VCH-2026-0001");
			assert.equal(chart.rows[1]?.serial, 2);
		} finally {
			prisma.school.findUnique = originalSchoolFind;
			prisma.customExpenseSheet.findFirst = originalSheetFind;
			prisma.customExpenseEntry.findMany = originalEntryFind;
		}
	});

	it("rejects duplicate column labels, guards NaN numbers, blocks mutations on archived sheets, and enforces ADMIN-only DELETE routes", async () => {
		assert.throws(
			() =>
				assertNoDuplicateFieldLabels([
					{ label: "দোকানের নাম" },
					{ label: "  দোকানের নাম  " },
				]),
			/Duplicate column label/,
		);

		assert.equal(parseSafeFiniteNumber("42.5"), 42.5);
		assert.equal(parseSafeFiniteNumber("abc"), null);
		assert.equal(parseSafeFiniteNumber(Number.NaN), null);
		assert.equal(parseSafeFiniteNumber(Number.POSITIVE_INFINITY), null);

		const originalSheetFind = prisma.customExpenseSheet.findFirst;
		try {
			(
				prisma.customExpenseSheet as unknown as { findFirst: unknown }
			).findFirst = async () => ({
				id: 99,
				schoolId: 7,
				name: "Old Archived Sheet",
				description: null,
				isActive: false,
				createdById: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
				fields: [],
				_count: { entries: 0 },
			});

			await assert.rejects(
				() =>
					createCustomExpenseEntry(7, 99, 1, {
						amount: 500,
					}),
				/archived/i,
			);
		} finally {
			prisma.customExpenseSheet.findFirst = originalSheetFind;
		}

		// Verify ADMIN-only RBAC on destructive DELETE and restore routes
		const routerStack = (
			customExpenseRoutes as unknown as {
				stack: Array<{
					route?: {
						path: string;
						methods: Record<string, boolean>;
						stack: Array<{
							handle: (
								req: {
									user?: { userId: number; role: UserRole; schoolId: number };
								},
								res: unknown,
								next: (err?: unknown) => void,
							) => void;
						}>;
					};
				}>;
			}
		).stack;

		const adminOnlyRoutes = [
			{
				path: "/schools/:schoolId/custom-expenses/sheets/:sheetId",
				method: "delete",
			},
			{
				path: "/schools/:schoolId/custom-expenses/sheets/:sheetId/entries/:entryId",
				method: "delete",
			},
			{
				path: "/schools/:schoolId/custom-expenses/sheets/:sheetId/restore",
				method: "patch",
			},
		];

		for (const target of adminOnlyRoutes) {
			const layer = routerStack.find(
				(l) => l.route?.path === target.path && l.route.methods[target.method],
			);
			assert.ok(
				layer?.route,
				`Route ${target.method.toUpperCase()} ${target.path} should exist`,
			);
			const authz = layer.route.stack[1]?.handle;
			assert.ok(authz);

			let managerErr: unknown;
			authz(
				{ user: { userId: 2, role: UserRole.MANAGER, schoolId: 7 } },
				{},
				(err?: unknown) => {
					managerErr = err;
				},
			);
			assert.equal((managerErr as { statusCode?: number })?.statusCode, 403);

			let adminErr: unknown;
			authz(
				{ user: { userId: 1, role: UserRole.ADMIN, schoolId: 7 } },
				{},
				(err?: unknown) => {
					adminErr = err;
				},
			);
			assert.equal(adminErr, undefined);
		}
	});
});
