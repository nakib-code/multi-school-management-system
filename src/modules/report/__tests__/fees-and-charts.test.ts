import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { NextFunction, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import type { AuthRequest } from "../../../middleware/auth.js";
import { requireSchoolAccess } from "../../../middleware/schoolAccess.js";
import { approveAdmission } from "../../admission/service.js";
import { resolveClassFeeAmount } from "../../class/service.js";
import {
	getAdmissionChartReport,
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
