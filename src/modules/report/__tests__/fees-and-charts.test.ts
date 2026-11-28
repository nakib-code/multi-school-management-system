import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { NextFunction, Response } from "express";
import {
	DiscountMode,
	FeeStatus,
	Prisma,
	StudentConcessionType,
	UserRole,
} from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.js";
import { requireSchoolAccess } from "../../../middleware/schoolAccess.js";
import { approveAdmission } from "../../admission/service.js";
import { resolveClassFeeAmount } from "../../class/service.js";
import {
	computeConcessionDiscount,
	computeFeeFinancials,
	updateStudentFee,
} from "../../student-fee/service.js";
import {
	getAdmissionChartReport,
	getDefaulterListReport,
	getFeeChartReport,
	getSchoolReportOverview,
	getStudentRosterChartReport,
} from "../service.js";

const restorers: Array<() => void> = [];

function stubDelegate(
	modelName: keyof typeof prisma,
	overrides: Record<string, unknown>,
) {
	const originalDesc = Object.getOwnPropertyDescriptor(prisma, modelName);
	const originalVal = prisma[modelName];
	Object.defineProperty(prisma, modelName, {
		value: overrides,
		configurable: true,
		writable: true,
	});
	restorers.push(() => {
		if (originalDesc) {
			Object.defineProperty(prisma, modelName, originalDesc);
		} else {
			Object.defineProperty(prisma, modelName, {
				value: originalVal,
				configurable: true,
				writable: true,
			});
		}
	});
}

afterEach(() => {
	while (restorers.length > 0) {
		restorers.pop()?.();
	}
});

describe("Class Fee Resolution Fallback Chain", () => {
	it("prefers year-specific ClassFeeStructure over default and SchoolSetting", async () => {
		stubDelegate("classFeeStructure", {
			findMany: async () => [
				{
					id: 1,
					feeType: "ADMISSION",
					title: null,
					amount: 2000,
					academicYear: null,
				},
				{
					id: 2,
					feeType: "ADMISSION",
					title: "2026 Admission",
					amount: 3500,
					academicYear: "2026",
				},
			],
		});

		const res = await resolveClassFeeAmount(1, 5, "ADMISSION", "2026");
		assert.equal(res.amount, 3500);
		assert.equal(res.source, "CLASS_YEAR");
	});

	it("falls back to academicYear=null ClassFeeStructure when year does not match", async () => {
		stubDelegate("classFeeStructure", {
			findMany: async () => [
				{
					id: 1,
					feeType: "MONTHLY",
					title: null,
					amount: 1200,
					academicYear: null,
				},
			],
		});

		const res = await resolveClassFeeAmount(1, 5, "MONTHLY", "2027");
		assert.equal(res.amount, 1200);
		assert.equal(res.source, "CLASS_DEFAULT");
	});

	it("falls back to SchoolSetting.admissionFee for ADMISSION and NONE for other types", async () => {
		stubDelegate("classFeeStructure", {
			findMany: async () => [],
		});
		stubDelegate("schoolSetting", {
			findUnique: async () => ({ admissionFee: 1800 }),
		});

		const adm = await resolveClassFeeAmount(1, 5, "ADMISSION", "2026");
		assert.equal(adm.amount, 1800);
		assert.equal(adm.source, "SCHOOL_DEFAULT");

		const lab = await resolveClassFeeAmount(1, 5, "LAB", "2026");
		assert.equal(lab.amount, null);
		assert.equal(lab.source, "NONE");
	});
});

describe("Unified Admission -> StudentFee Ledger & Roll Assignment", () => {
	it("assigns next rollNumber, syncs paid AdmissionPayment safely on TrxID collision, and avoids double counting in overview", async () => {
		let createdEnrollmentData: Record<string, unknown> | undefined;
		let createdFeeData: Record<string, unknown> | undefined;
		let createdPaymentData: Record<string, unknown> | undefined;

		const admissionRecord = {
			id: 99,
			schoolId: 1,
			classId: 3,
			sectionId: 7,
			applicationNo: "ADM-2026-0099",
			studentName: "Ayesha Siddiqua",
			nameBangla: null,
			studentEmail: null,
			passwordHash: null,
			dateOfBirth: new Date("2015-01-01"),
			gender: "FEMALE",
			residentialType: "NON_RESIDENTIAL",
			guardianName: "Rahman",
			guardianPhone: "01711000000",
			guardianRelationship: "FATHER",
			guardianEmail: null,
			guardianNid: null,
			guardianOccupation: null,
			fatherName: null,
			motherName: null,
			address: null,
			presentAddress: null,
			permanentAddress: null,
			academicYear: "2026",
			shift: "MORNING",
			group: null,
			academicGroup: null,
			quranWing: null,
			bloodGroup: null,
			birthRegNo: null,
			previousSchool: null,
			previousClass: null,
			studentPhotoUrl: null,
			birthCertificateUrl: null,
			previousCertificateUrl: null,
			guardianNidUrl: null,
			previousTcUrl: null,
			marksheetUrl: null,
			status: "PENDING",
			class: { id: 3, name: "Class 1", code: "C1" },
			section: { id: 7, name: "A", capacity: 40 },
			payment: {
				id: 501,
				amount: 2500,
				paymentMethod: "BKASH",
				status: "PAID",
				transactionId: "TRX999",
				senderNumber: "01711000000",
				paidAt: new Date("2026-11-20T00:00:00Z"),
				receivedBy: 2,
				remarks: "Verified",
			},
		};

		const fakeTx = {
			schoolSubscription: {
				findFirst: async () => ({
					package: { id: 1, name: "Pro", studentLimit: 500 },
				}),
			},
			schoolSetting: {
				findUnique: async () => ({
					bkashNumber: "01700000000",
					nagadNumber: null,
					rocketNumber: null,
				}),
			},
			student: {
				count: async () => 10,
				create: async () => ({ id: 42, studentId: "STU-1-42" }),
			},
			enrollment: {
				count: async () => 5,
				aggregate: async () => ({ _max: { rollNumber: 12 } }),
				create: async (args: { data: Record<string, unknown> }) => {
					createdEnrollmentData = args.data;
					return {
						id: 77,
						classId: 3,
						sectionId: 7,
						academicYear: "2026",
						rollNumber: args.data.rollNumber,
					};
				},
			},
			guardian: {
				findFirst: async () => ({
					id: 88,
					nid: null,
					user: {
						id: 90,
						name: "Rahman",
						email: "r@test.local",
						phone: "01711000000",
					},
				}),
				update: async () => ({}),
			},
			guardianStudent: {
				upsert: async () => ({}),
			},
			studentFee: {
				create: async (args: { data: Record<string, unknown> }) => {
					createdFeeData = args.data;
					return { id: 300 };
				},
			},
			studentPayment: {
				// Simulate an existing active payment with TRX999 so suffix guard triggers
				findFirst: async () => ({ id: 111 }),
				create: async (args: { data: Record<string, unknown> }) => {
					createdPaymentData = args.data;
					return { id: 301 };
				},
			},
			admission: {
				findFirst: async () => admissionRecord,
				updateMany: async () => ({ count: 1 }),
				findUniqueOrThrow: async () => ({
					id: 99,
					applicationNo: "ADM-2026-0099",
					studentName: "Ayesha Siddiqua",
					status: "APPROVED",
					reviewedAt: new Date(),
				}),
			},
		};

		stubDelegate("$transaction", (async (
			fn: (tx: typeof fakeTx) => Promise<unknown>,
		) => fn(fakeTx)) as unknown as Record<string, unknown>);

		const approved = await approveAdmission(1, 99, 2);
		assert.equal(approved.status, "APPROVED");
		assert.equal(approved.rollNumber, 13);
		assert.equal(createdEnrollmentData?.rollNumber, 13);
		assert.equal(createdFeeData?.feeType, "ADMISSION");
		assert.equal(createdFeeData?.admissionPaymentId, 501);
		assert.equal(createdPaymentData?.trxId, "ADM-501-TRX999");
		assert.equal(createdPaymentData?.receiverNumber, "01700000000");

		// Verify getSchoolReportOverview does not double-count linked admission payment
		stubDelegate("studentFee", {
			findMany: async () => [
				{
					feeType: "ADMISSION",
					amount: 2500,
					status: "PAID",
					payments: [{ paidAmount: 2500 }],
				},
				{
					feeType: "MONTHLY",
					amount: 1500,
					status: "PARTIAL",
					payments: [{ paidAmount: 500 }],
				},
			],
		});
		stubDelegate("studentPayment", { count: async () => 1 });
		stubDelegate("teacherSalary", { findMany: async () => [] });
		stubDelegate("student", { count: async () => 1 });
		stubDelegate("teacher", { count: async () => 1 });
		stubDelegate("schoolClass", { count: async () => 1 });
		stubDelegate("exam", { count: async () => 0 });
		stubDelegate("result", { count: async () => 0 });
		stubDelegate("attendance", { count: async () => 0 });
		stubDelegate("admission", { count: async () => 1 });
		stubDelegate("admissionPayment", {
			findMany: async () => [
				// Linked to studentFee -> unlinkedCollected must remain 0
				{ amount: 2500, status: "PAID", studentFee: { id: 300 } },
				// Pending -> pendingPayment = 1000
				{ amount: 1000, status: "PENDING", studentFee: null },
			],
		});

		const overview = await getSchoolReportOverview(1);
		assert.equal(overview.fees.totalBilled, 4000);
		assert.equal(overview.fees.totalCollected, 3000);
		assert.equal(overview.fees.totalDue, 1000);
		assert.equal(overview.fees.byFeeType.length, 2);
		assert.equal(overview.admissions.collectedVerified, 2500);
		assert.equal(overview.admissions.unlinkedCollected, 0);
		assert.equal(overview.admissions.pendingPayment, 1000);
	});
});

describe("Multi-Tenant Isolation on Class-Wise Chart Reports", () => {
	it("blocks cross-school access via requireSchoolAccess", () => {
		let capturedError: unknown;
		const req = {
			user: { userId: 10, role: "ADMIN", schoolId: 1 },
			params: { schoolId: "2" },
		} as unknown as AuthRequest;
		const next: NextFunction = (err?: unknown) => {
			capturedError = err;
		};

		requireSchoolAccess(req, {} as Response, next);
		assert.ok(capturedError instanceof Error);
		assert.equal((capturedError as { statusCode?: number }).statusCode, 403);
	});

	it("scopes admissions, fees, and roster chart queries strictly by schoolId", async () => {
		const seenSchoolIds: number[] = [];

		stubDelegate("school", {
			findUnique: async () => ({
				id: 42,
				name: "School 42",
				code: "S42",
				logo: null,
				address: null,
				phone: null,
				email: null,
			}),
		});
		stubDelegate("admission", {
			findMany: async (args: { where: { schoolId: number } }) => {
				seenSchoolIds.push(args.where.schoolId);
				return [];
			},
		});
		stubDelegate("studentFee", {
			findMany: async (args: { where: { schoolId: number } }) => {
				seenSchoolIds.push(args.where.schoolId);
				return [];
			},
		});
		stubDelegate("enrollment", {
			findMany: async (args: { where: { schoolId: number } }) => {
				seenSchoolIds.push(args.where.schoolId);
				return [];
			},
		});

		await getAdmissionChartReport(42, { classId: 3 });
		await getFeeChartReport(42, { feeType: "MONTHLY" });
		await getStudentRosterChartReport(42, { classId: 3 });

		assert.deepEqual(seenSchoolIds, [42, 42, 42]);
	});
});

describe("Student Concessions, Automated OVERDUE, Partial Waivers & Defaulter List", () => {
	it("computes PERCENTAGE and FIXED concessions accurately including 100% orphan/lillah", () => {
		const orphanFull = computeConcessionDiscount(2000, {
			concessionType: StudentConcessionType.ORPHAN,
			concessionMode: DiscountMode.PERCENTAGE,
			concessionValue: 100,
			concessionReason: "এতিম ছাড়",
		});
		assert.equal(orphanFull.grossAmount, 2000);
		assert.equal(orphanFull.concessionAmount, 2000);
		assert.equal(orphanFull.netAmount, 0);
		assert.equal(orphanFull.concessionType, StudentConcessionType.ORPHAN);

		const scholarship25 = computeConcessionDiscount(1800, {
			concessionType: StudentConcessionType.SCHOLARSHIP,
			concessionMode: DiscountMode.PERCENTAGE,
			concessionValue: 25,
		});
		assert.equal(scholarship25.concessionAmount, 450);
		assert.equal(scholarship25.netAmount, 1350);

		const fixedCapped = computeConcessionDiscount(800, {
			concessionType: StudentConcessionType.SIBLING,
			concessionMode: DiscountMode.FIXED,
			concessionValue: 1500,
		});
		assert.equal(fixedCapped.concessionAmount, 800);
		assert.equal(fixedCapped.netAmount, 0);
	});

	it("marks past-due PENDING/PARTIAL fees as OVERDUE automatically and preserves paid cash under partial waivers", () => {
		const now = new Date("2026-11-28T06:00:00Z");

		const overduePending = computeFeeFinancials(
			{
				amount: new Prisma.Decimal("1500.00"),
				waivedAmount: new Prisma.Decimal("0.00"),
				status: FeeStatus.PENDING,
				dueDate: new Date("2026-11-10T00:00:00Z"),
				payments: [],
			},
			now,
		);
		assert.equal(overduePending.isOverdue, true);
		assert.equal(overduePending.effectiveStatus, FeeStatus.OVERDUE);
		assert.equal(overduePending.due, 1500);

		// Partial payment (600) + partial waiver (400) on 1500 fee -> paid stays 600, waived 400, due 500
		const partialWaived = computeFeeFinancials(
			{
				amount: new Prisma.Decimal("1500.00"),
				waivedAmount: new Prisma.Decimal("400.00"),
				status: FeeStatus.PARTIAL,
				dueDate: new Date("2026-12-05T00:00:00Z"),
				payments: [{ paidAmount: new Prisma.Decimal("600.00") }],
			},
			now,
		);
		assert.equal(partialWaived.paid, 600);
		assert.equal(partialWaived.waived, 400);
		assert.equal(partialWaived.due, 500);
		assert.equal(partialWaived.isOverdue, false);
		assert.equal(partialWaived.effectiveStatus, FeeStatus.PARTIAL);

		// Full waiver of remaining balance after partial payment preserves already-collected cash (600 paid, 900 waived, 0 due, PAID)
		const settledByWaiver = computeFeeFinancials(
			{
				amount: new Prisma.Decimal("1500.00"),
				waivedAmount: new Prisma.Decimal("900.00"),
				status: FeeStatus.WAIVED,
				dueDate: new Date("2026-11-10T00:00:00Z"),
				payments: [{ paidAmount: new Prisma.Decimal("600.00") }],
			},
			now,
		);
		assert.equal(settledByWaiver.paid, 600);
		assert.equal(settledByWaiver.waived, 900);
		assert.equal(settledByWaiver.due, 0);
		assert.equal(settledByWaiver.isOverdue, false);
		assert.equal(settledByWaiver.effectiveStatus, FeeStatus.PAID);
	});

	it("blocks MANAGER from approving fee waivers while allowing ADMIN", async () => {
		const fakeTx = {
			studentFee: {
				findFirst: async () => ({
					id: 55,
					schoolId: 10,
					title: "November Tuition",
					amount: new Prisma.Decimal("2000.00"),
					waivedAmount: new Prisma.Decimal("0.00"),
					waiverReason: null,
					status: FeeStatus.PENDING,
					dueDate: new Date("2026-11-10T00:00:00Z"),
				}),
				update: async (args: { data: Record<string, unknown> }) => ({
					id: 55,
					...args.data,
				}),
			},
			studentPayment: {
				aggregate: async () => ({
					_sum: { paidAmount: new Prisma.Decimal("500.00") },
				}),
			},
		};

		stubDelegate("$transaction", (async (
			fn: (tx: typeof fakeTx) => Promise<unknown>,
		) => fn(fakeTx)) as unknown as Record<string, unknown>);

		await assert.rejects(
			() =>
				updateStudentFee(
					10,
					55,
					{ waivedAmount: 500, waiverReason: "Hardship" },
					{ userId: 2, role: UserRole.MANAGER },
				),
			(err: unknown) => (err as { statusCode?: number }).statusCode === 403,
		);

		const adminResult = await updateStudentFee(
			10,
			55,
			{ waivedAmount: 500, waiverReason: "Approved by Principal" },
			{ userId: 1, role: UserRole.ADMIN },
		);
		assert.ok(adminResult);
	});

	it("groups unpaid & overdue invoices per student in Defaulter List and enforces schoolId isolation", async () => {
		let capturedFeeWhere: Record<string, unknown> | undefined;
		let capturedGroupByWhere: Record<string, unknown> | undefined;

		stubDelegate("school", {
			findUnique: async () => ({
				id: 19,
				name: "Nooria Madrasa",
				code: "NM-19",
				logo: null,
				address: "Dhaka",
				phone: "01712345678",
				email: null,
			}),
		});
		stubDelegate("studentFee", {
			findMany: async (args: { where: Record<string, unknown> }) => {
				capturedFeeWhere = args.where;
				return [
					{
						id: 1,
						studentId: 101,
						title: "October Tuition",
						amount: new Prisma.Decimal("1500.00"),
						waivedAmount: new Prisma.Decimal("0.00"),
						status: FeeStatus.PENDING,
						dueDate: new Date("2020-01-15T00:00:00Z"), // guaranteed past due
						student: {
							id: 101,
							studentId: "STU-101",
							firstName: "Hasan",
							lastName: "Ali",
							nameBangla: "হাসান আলী",
							phone: null,
							fatherName: "Karim Ali",
							fatherPhone: "01711112222",
							guardians: [],
						},
						enrollment: {
							rollNumber: 3,
							academicYear: "2026",
							class: { id: 1, name: "Class 5", code: "C5" },
							section: { id: 1, name: "A" },
						},
						payments: [],
					},
					{
						id: 2,
						studentId: 101,
						title: "November Tuition",
						amount: new Prisma.Decimal("1500.00"),
						waivedAmount: new Prisma.Decimal("200.00"),
						status: FeeStatus.PARTIAL,
						dueDate: new Date("2020-02-15T00:00:00Z"), // guaranteed past due
						student: {
							id: 101,
							studentId: "STU-101",
							firstName: "Hasan",
							lastName: "Ali",
							nameBangla: "হাসান আলী",
							phone: null,
							fatherName: "Karim Ali",
							fatherPhone: "01711112222",
							guardians: [],
						},
						enrollment: {
							rollNumber: 3,
							academicYear: "2026",
							class: { id: 1, name: "Class 5", code: "C5" },
							section: { id: 1, name: "A" },
						},
						payments: [
							{
								paidAmount: new Prisma.Decimal("300.00"),
								paidAt: new Date("2026-10-01T06:00:00Z"),
							},
						],
					},
					{
						id: 3,
						studentId: 102,
						title: "Future Tuition",
						amount: new Prisma.Decimal("1000.00"),
						waivedAmount: new Prisma.Decimal("0.00"),
						status: FeeStatus.PENDING,
						dueDate: new Date("2099-12-31T00:00:00Z"), // not overdue
						student: {
							id: 102,
							studentId: "STU-102",
							firstName: "Bilal",
							lastName: null,
							nameBangla: null,
							phone: "01899998888",
							fatherName: null,
							fatherPhone: null,
							guardians: [],
						},
						enrollment: {
							rollNumber: 7,
							academicYear: "2026",
							class: { id: 1, name: "Class 5", code: "C5" },
							section: { id: 1, name: "A" },
						},
						payments: [],
					},
				];
			},
		});
		stubDelegate("studentPayment", {
			groupBy: async (args: { where: Record<string, unknown> }) => {
				capturedGroupByWhere = args.where;
				return [
					{
						studentId: 101,
						_max: { paidAt: new Date("2026-10-01T06:00:00Z") },
					},
				];
			},
		});

		const report = await getDefaulterListReport(19, { status: "OVERDUE" });
		assert.equal(capturedFeeWhere?.schoolId, 19);
		assert.equal(capturedGroupByWhere?.schoolId, 19);
		assert.equal(report.summary.totalDefaulters, 1);
		assert.equal(report.summary.overdueStudentsCount, 1);
		assert.equal(report.summary.totalUnpaidInvoices, 2);
		// Student 101: fee 1 due 1500 + fee 2 due (1500 - 300 paid - 200 waived = 1000) = 2500
		assert.equal(report.summary.totalDueAmount, 2500);
		assert.equal(report.summary.totalOverdueAmount, 2500);
		assert.equal(report.rows[0]?.studentCode, "STU-101");
		assert.equal(report.rows[0]?.guardianPhone, "01711112222");
		assert.equal(report.rows[0]?.lastPaymentDate, "2026-10-01");
	});
});
