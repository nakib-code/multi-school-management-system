import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AdmissionPaymentStatus,
	FeeType,
	PaymentMethod,
	PaymentStatus,
	Prisma,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import {
	deleteOtherIncomeEntry,
	getIncomeMonthlyChart,
	getIncomeSummary,
	mapFeeTypeToIncomeCategory,
	normalizeIncomeDate,
} from "../service.js";
import { createOtherIncomeSchema } from "../validation.js";

describe("Income Module Helpers & Validation", () => {
	it("maps FeeType cleanly to unified income categories", () => {
		assert.equal(mapFeeTypeToIncomeCategory(FeeType.MONTHLY), "MONTHLY_FEE");
		assert.equal(
			mapFeeTypeToIncomeCategory(FeeType.ADMISSION),
			"ADMISSION_FEE",
		);
		assert.equal(mapFeeTypeToIncomeCategory(FeeType.EXAM), "OTHER_STUDENT_FEE");
		assert.equal(
			mapFeeTypeToIncomeCategory(FeeType.TRANSPORT),
			"OTHER_STUDENT_FEE",
		);
	});

	it("normalizes incomeDate and rejects invalid or over-cap amounts", () => {
		const parsed = normalizeIncomeDate("2026-11-18");
		assert.equal(parsed.dateKey, "2026-11-18");
		assert.equal(parsed.billingMonth, "2026-11");

		const invalidAmount = createOtherIncomeSchema.safeParse({
			params: { schoolId: 5 },
			body: {
				sourceLabel: "দান / অনুদান",
				title: "Annual Donation",
				amount: 100000000,
			},
		});
		assert.equal(invalidAmount.success, false);
	});
});

describe("Unified Income Aggregation, Non-Double-Counting & School Isolation", () => {
	it("aggregates all 4 categories, excludes already-synced admission payments, and enforces schoolId scope", async () => {
		const origStudentPayFind = prisma.studentPayment.findMany;
		const origAdmissionPayFind = prisma.admissionPayment.findMany;
		const origIncomeFind = prisma.incomeEntry.findMany;
		const origSchoolFind = prisma.school.findUnique;

		const captured: {
			studentWhere?: Record<string, unknown>;
			admissionWhere?: Record<string, unknown>;
			incomeWhere?: Record<string, unknown>;
		} = {};

		try {
			(prisma.school as unknown as { findUnique: unknown }).findUnique =
				async () => ({
					id: 9,
					name: "Jamia Arabia Madrasa",
					code: "JAM-09",
					logo: null,
					address: "Chattogram",
					phone: "01800000000",
					email: "info@jamia.edu.bd",
				});

			(prisma.studentPayment as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.studentWhere = args.where;
					return [
						{
							id: 1,
							paidAmount: new Prisma.Decimal("1500.00"),
							paymentMethod: PaymentMethod.BKASH,
							trxId: "TRX-MON-1",
							paidAt: new Date("2026-11-05T06:00:00Z"),
							remarks: null,
							student: {
								firstName: "Abdullah",
								lastName: "Hasan",
								studentId: "STU-001",
							},
							fee: { feeType: FeeType.MONTHLY, title: "November Tuition" },
							verifiedBy: { name: "Admin" },
						},
						{
							id: 2,
							paidAmount: new Prisma.Decimal("2000.00"),
							paymentMethod: PaymentMethod.CASH,
							trxId: "TRX-ADM-SYNCED",
							paidAt: new Date("2026-11-06T06:00:00Z"),
							remarks: "Synced from approved admission",
							student: {
								firstName: "Yusuf",
								lastName: null,
								studentId: "STU-002",
							},
							fee: { feeType: FeeType.ADMISSION, title: "Admission Fee" },
							verifiedBy: { name: "Admin" },
						},
						{
							id: 3,
							paidAmount: new Prisma.Decimal("500.00"),
							paymentMethod: PaymentMethod.NAGAD,
							trxId: "TRX-EXAM-1",
							paidAt: new Date("2026-11-06T09:00:00Z"),
							remarks: null,
							student: {
								firstName: "Abdullah",
								lastName: "Hasan",
								studentId: "STU-001",
							},
							fee: { feeType: FeeType.EXAM, title: "Final Exam Fee" },
							verifiedBy: { name: "Manager" },
						},
					];
				};

			(prisma.admissionPayment as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.admissionWhere = args.where;
					return [
						{
							id: 77,
							amount: new Prisma.Decimal("1000.00"),
							paymentMethod: "BKASH",
							transactionId: "TRX-ADM-PENDING-APPROVAL",
							paidAt: new Date("2026-11-10T07:00:00Z"),
							createdAt: new Date("2026-11-10T07:00:00Z"),
							remarks: null,
							admission: {
								studentName: "Bilal Ahmed",
								applicationNo: "ADM-2026-009",
							},
							receivedByUser: { name: "Admin" },
						},
					];
				};

			(prisma.incomeEntry as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.incomeWhere = args.where;
					return [
						{
							id: 31,
							sourceLabel: "দান / অনুদান",
							title: "লিল্লাহ বোর্ডিং অনুদান",
							amount: new Prisma.Decimal("5000.00"),
							incomeDate: new Date(Date.UTC(2026, 10, 12, 12, 0, 0)),
							billingMonth: "2026-11",
							paymentMethod: PaymentMethod.CASH,
							referenceNo: "RCPT-31",
							notes: "Donor cash",
							recordedBy: { name: "Admin" },
						},
					];
				};

			const summary = await getIncomeSummary(9, {
				billingMonth: "2026-11",
			});

			// Strict schoolId isolation & non-double-counting query filters
			assert.equal(captured.studentWhere?.schoolId, 9);
			assert.equal(captured.studentWhere?.status, PaymentStatus.VERIFIED);
			assert.equal(captured.admissionWhere?.schoolId, 9);
			assert.equal(
				captured.admissionWhere?.status,
				AdmissionPaymentStatus.PAID,
			);
			assert.deepEqual(captured.admissionWhere?.studentFee, { is: null });
			assert.equal(captured.incomeWhere?.schoolId, 9);

			// Category totals
			assert.equal(summary.monthlyFeeTotal, 1500);
			assert.equal(summary.admissionFeeTotal, 3000); // 2000 synced + 1000 unsynced
			assert.equal(summary.otherStudentFeeTotal, 500);
			assert.equal(summary.otherIncomeTotal, 5000);
			assert.equal(summary.grandTotal, 10000);
			assert.equal(summary.rows.length, 5);

			const otherShare = summary.byCategory.find(
				(c) => c.category === "OTHER_INCOME",
			);
			assert.equal(otherShare?.percentage, 50);

			// Monthly chart filtered by category
			const chart = await getIncomeMonthlyChart(9, {
				billingMonth: "2026-11",
				category: "ADMISSION_FEE",
			});
			assert.equal(chart.displayedTotal, 3000);
			assert.equal(chart.grandTotal, 10000);
			assert.equal(chart.rows.length, 2);
			assert.equal(chart.dailySeries.length, 30);
			const day6 = chart.dailySeries.find((d) => d.date === "2026-11-06");
			assert.equal(day6?.totalAmount, 2000);
		} finally {
			prisma.studentPayment.findMany = origStudentPayFind;
			prisma.admissionPayment.findMany = origAdmissionPayFind;
			prisma.incomeEntry.findMany = origIncomeFind;
			prisma.school.findUnique = origSchoolFind;
		}
	});

	it("rejects deleting another school's manual income entry with 404", async () => {
		const origFindFirst = prisma.incomeEntry.findFirst;
		try {
			(prisma.incomeEntry as unknown as { findFirst: unknown }).findFirst =
				async (args: { where: { id: number; schoolId: number } }) => {
					assert.equal(args.where.schoolId, 99);
					return null;
				};

			await assert.rejects(
				() => deleteOtherIncomeEntry(99, 31),
				/Income entry not found/,
			);
		} finally {
			prisma.incomeEntry.findFirst = origFindFirst;
		}
	});
});
