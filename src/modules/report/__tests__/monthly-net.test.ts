import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AdmissionPaymentStatus,
	FeeType,
	PaymentStatus,
	Prisma,
	SalaryPaymentStatus,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import {
	buildTrailingMonths,
	computeExpenseSharePercent,
	getMonthlyNetReport,
} from "../monthlyNet.service.js";

describe("Monthly Net Report Helpers", () => {
	it("builds chronological trailing months across year boundary", () => {
		assert.deepEqual(buildTrailingMonths("2026-02", 6), [
			"2025-09",
			"2025-10",
			"2025-11",
			"2025-12",
			"2026-01",
			"2026-02",
		]);
	});

	it("computes expenseSharePercent safely for zero-income and normal months", () => {
		assert.equal(computeExpenseSharePercent(10000, 3500), 35);
		assert.equal(computeExpenseSharePercent(0, 0), 0);
		assert.equal(computeExpenseSharePercent(0, 500), 100);
	});
});

describe("Monthly Net Income vs Expense Report", () => {
	it("computes SURPLUS/DEFICIT with disbursed Teacher Payroll, 6-month trend, daily net series, and enforces schoolId isolation", async () => {
		const origSchool = prisma.school.findUnique;
		const origStudentPay = prisma.studentPayment.findMany;
		const origAdmissionPay = prisma.admissionPayment.findMany;
		const origIncome = prisma.incomeEntry.findMany;
		const origExpense = prisma.customExpenseEntry.findMany;
		const origSalaryPay = prisma.salaryPayment.findMany;

		const captured: {
			studentWhere?: Record<string, unknown>;
			admissionWhere?: Record<string, unknown>;
			incomeWhere?: Record<string, unknown>;
			expenseWhere?: Record<string, unknown>;
			salaryWhere?: Record<string, unknown>;
		} = {};

		try {
			(prisma.school as unknown as { findUnique: unknown }).findUnique =
				async () => ({
					id: 14,
					name: "Al-Madina Madrasa",
					code: "AMM-14",
					logo: null,
					address: "Sylhet",
					phone: "01711111111",
					email: "info@amm.edu.bd",
				});

			(prisma.studentPayment as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.studentWhere = args.where;
					return [
						{
							paidAmount: new Prisma.Decimal("8000.00"),
							paidAt: new Date("2026-11-05T06:00:00Z"),
							fee: { feeType: FeeType.MONTHLY },
						},
						{
							paidAmount: new Prisma.Decimal("2000.00"),
							paidAt: new Date("2026-10-10T06:00:00Z"),
							fee: { feeType: FeeType.MONTHLY },
						},
					];
				};

			(prisma.admissionPayment as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.admissionWhere = args.where;
					return [
						{
							amount: new Prisma.Decimal("1500.00"),
							paidAt: new Date("2026-11-05T08:00:00Z"),
							createdAt: new Date("2026-11-05T08:00:00Z"),
						},
					];
				};

			(prisma.incomeEntry as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.incomeWhere = args.where;
					return [
						{
							amount: new Prisma.Decimal("2500.00"),
							incomeDate: new Date(Date.UTC(2026, 10, 12, 12, 0, 0)),
							billingMonth: "2026-11",
						},
					];
				};

			(prisma.customExpenseEntry as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.expenseWhere = args.where;
					return [
						{
							amount: new Prisma.Decimal("3000.00"),
							entryDate: new Date(Date.UTC(2026, 10, 5, 12, 0, 0)),
							billingMonth: "2026-11",
							sheetId: 1,
							sheet: { id: 1, name: "বাজার বিল" },
						},
						{
							amount: new Prisma.Decimal("1800.00"),
							entryDate: new Date(Date.UTC(2026, 10, 15, 12, 0, 0)),
							billingMonth: "2026-11",
							sheetId: 2,
							sheet: { id: 2, name: "কারেন্ট বিল" },
						},
						{
							amount: new Prisma.Decimal("3500.00"),
							entryDate: new Date(Date.UTC(2026, 9, 10, 12, 0, 0)),
							billingMonth: "2026-10",
							sheetId: 1,
							sheet: { id: 1, name: "বাজার বিল" },
						},
					];
				};

			(prisma.salaryPayment as unknown as { findMany: unknown }).findMany =
				async (args: { where: Record<string, unknown> }) => {
					captured.salaryWhere = args.where;
					return [
						{
							amount: new Prisma.Decimal("4200.00"),
							paidAt: new Date("2026-11-05T10:00:00Z"),
						},
						{
							amount: new Prisma.Decimal("1000.00"),
							paidAt: new Date("2026-10-10T10:00:00Z"),
						},
					];
				};

			const report = await getMonthlyNetReport(14, {
				billingMonth: "2026-11",
				trendMonths: 6,
			});

			// Strict multi-tenant isolation & non-double-counting
			assert.equal(captured.studentWhere?.schoolId, 14);
			assert.equal(captured.studentWhere?.status, PaymentStatus.VERIFIED);
			assert.equal(captured.admissionWhere?.schoolId, 14);
			assert.equal(
				captured.admissionWhere?.status,
				AdmissionPaymentStatus.PAID,
			);
			assert.deepEqual(captured.admissionWhere?.studentFee, { is: null });
			assert.equal(captured.incomeWhere?.schoolId, 14);
			assert.equal(captured.expenseWhere?.schoolId, 14);
			assert.equal(captured.salaryWhere?.schoolId, 14);
			assert.equal(captured.salaryWhere?.status, SalaryPaymentStatus.COMPLETED);

			// Selected month (2026-11):
			// income = 8000 + 1500 + 2500 = 12000
			// custom expense = 3000 + 1800 = 4800; payroll = 4200; totalExpense = 9000
			assert.equal(report.includePayroll, true);
			assert.equal(report.summary.totalIncome, 12000);
			assert.equal(report.summary.customExpenseTotal, 4800);
			assert.equal(report.summary.payrollExpenseTotal, 4200);
			assert.equal(report.summary.payrollPaymentCount, 1);
			assert.equal(report.summary.totalExpense, 9000);
			assert.equal(report.summary.netBalance, 3000);
			assert.equal(report.summary.status, "SURPLUS");
			assert.equal(report.summary.expenseSharePercent, 75);

			// Expense breakdown sorted desc: Payroll (4200), বাজার বিল (3000), কারেন্ট বিল (1800)
			assert.equal(report.expenseBreakdown.length, 3);
			assert.equal(report.expenseBreakdown[0]?.sourceType, "TEACHER_PAYROLL");
			assert.equal(
				report.expenseBreakdown[0]?.sheetName,
				"শিক্ষক বেতন (Teacher Payroll)",
			);
			assert.equal(report.expenseBreakdown[0]?.totalAmount, 4200);
			assert.equal(report.expenseBreakdown[1]?.sheetName, "বাজার বিল");
			assert.equal(report.expenseBreakdown[1]?.totalAmount, 3000);

			// Daily series check (Nov 5: income 9500, custom 3000 + payroll 4200 = 7200, net 2300)
			const nov5 = report.dailySeries.find((d) => d.date === "2026-11-05");
			assert.deepEqual(nov5, {
				date: "2026-11-05",
				day: 5,
				income: 9500,
				expense: 7200,
				net: 2300,
			});

			// 6-month trend: Oct 2026 was DEFICIT (2000 - (3500 + 1000) = -2500)
			assert.equal(report.trend.length, 6);
			const oct = report.trend.find((t) => t.billingMonth === "2026-10");
			assert.deepEqual(oct, {
				billingMonth: "2026-10",
				totalIncome: 2000,
				customExpense: 3500,
				payrollExpense: 1000,
				totalExpense: 4500,
				netBalance: -2500,
				status: "DEFICIT",
			});

			// Zero-data month (2026-06) should be 0 / SURPLUS
			const jun = report.trend.find((t) => t.billingMonth === "2026-06");
			assert.deepEqual(jun, {
				billingMonth: "2026-06",
				totalIncome: 0,
				customExpense: 0,
				payrollExpense: 0,
				totalExpense: 0,
				netBalance: 0,
				status: "SURPLUS",
			});

			// Toggle includePayroll = false excludes payroll from totalExpense & breakdown while preserving payrollExpenseTotal visibility
			const withoutPayroll = await getMonthlyNetReport(14, {
				billingMonth: "2026-11",
				trendMonths: 6,
				includePayroll: false,
			});
			assert.equal(withoutPayroll.includePayroll, false);
			assert.equal(withoutPayroll.summary.totalExpense, 4800);
			assert.equal(withoutPayroll.summary.payrollExpenseTotal, 4200);
			assert.equal(withoutPayroll.summary.netBalance, 7200);
			assert.equal(withoutPayroll.summary.expenseSharePercent, 40);
			assert.equal(withoutPayroll.expenseBreakdown.length, 2);
		} finally {
			prisma.school.findUnique = origSchool;
			prisma.studentPayment.findMany = origStudentPay;
			prisma.admissionPayment.findMany = origAdmissionPay;
			prisma.incomeEntry.findMany = origIncome;
			prisma.customExpenseEntry.findMany = origExpense;
			prisma.salaryPayment.findMany = origSalaryPay;
		}
	});
});
