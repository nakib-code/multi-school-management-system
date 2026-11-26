import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { prisma } from "../../../lib/prisma.js";
import {
	calculateAttendanceRate,
	countWorkingDaysInMonth,
	getSchoolTodayStr,
	isWithinTeacherEditWindow,
	parseLocalDateToUtcMidnight,
	shouldNotifyGuardianForChange,
} from "../../../utils/attendanceDate.js";
import {
	assertDateEditableByActor,
	assertTeacherCanAccessEnrollments,
	assertWorkingDay,
	buildTeacherEnrollmentScopeWhere,
	dispatchAttendanceChangeAlerts,
} from "../helpers.js";
import {
	cancelLeaveRequest,
	createLeaveRequest,
	reviewLeaveRequest,
} from "../leave.service.js";
import {
	deleteAttendance,
	getAttendanceById,
	getAttendances,
} from "../service.js";
import { createLeaveRequestSchema } from "../validation.js";

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

describe("1. Attendance % formula & Asia/Dhaka working days", () => {
	it("computes (Present + Late) / (Working Days - Excused) * 100", () => {
		assert.equal(calculateAttendanceRate(16, 2, 2, 22), 90);
		assert.equal(calculateAttendanceRate(17, 1, 0, 21), 85.7);
	});

	it("guards divide-by-zero when Working Days - Excused <= 0", () => {
		assert.equal(calculateAttendanceRate(0, 0, 0, 0), 0);
		assert.equal(calculateAttendanceRate(0, 0, 5, 5), 0);
		assert.equal(calculateAttendanceRate(0, 0, 10, 5), 0);
	});

	it("counts working days only up to today for current month and excludes weekly-offs & holidays", () => {
		const res = countWorkingDaysInMonth(
			"2026-11",
			[5],
			new Set(["2026-11-04"]),
			"2026-11-10",
		);
		assert.equal(res.workingDays, 8);
		assert.ok(!res.workingDateStrs.includes("2026-11-06"));
		assert.ok(!res.workingDateStrs.includes("2026-11-04"));
		assert.ok(!res.workingDateStrs.includes("2026-11-11"));
	});

	it("counts full month working days for past months and 0 for future months", () => {
		const past = countWorkingDaysInMonth(
			"2026-10",
			[5],
			new Set(),
			"2026-11-26",
		);
		assert.equal(past.workingDays, 26);

		const future = countWorkingDaysInMonth(
			"2026-12",
			[5],
			new Set(),
			"2026-11-26",
		);
		assert.equal(future.workingDays, 0);
	});
});

describe("2. Change-only notifications (Rule 5)", () => {
	it("never notifies on initial PRESENT or unchanged re-save", () => {
		assert.equal(
			shouldNotifyGuardianForChange(null, null, "PRESENT", null),
			false,
		);
		assert.equal(
			shouldNotifyGuardianForChange("ABSENT", "Sick", "ABSENT", "Sick"),
			false,
		);
		assert.equal(
			shouldNotifyGuardianForChange("PRESENT", null, "PRESENT", null),
			false,
		);
	});

	it("notifies when changed TO ABSENT/LATE/EXCUSED or AWAY FROM them", () => {
		assert.equal(
			shouldNotifyGuardianForChange(null, null, "ABSENT", null),
			true,
		);
		assert.equal(
			shouldNotifyGuardianForChange(null, null, "LATE", "10m late"),
			true,
		);
		assert.equal(
			shouldNotifyGuardianForChange(null, null, "EXCUSED", "Approved leave"),
			true,
		);
		assert.equal(
			shouldNotifyGuardianForChange("ABSENT", null, "PRESENT", null),
			true,
		);
		assert.equal(
			shouldNotifyGuardianForChange("LATE", "5m", "LATE", "15m"),
			true,
		);
	});

	it("dispatches only to linked guardians, never the actor, with required metadata", async () => {
		const createdPayloads: unknown[] = [];

		stubDelegate("student", {
			findMany: async () => [
				{
					id: 10,
					guardians: [
						{ guardian: { userId: 101 } },
						{ guardian: { userId: 999 } }, // actor himself -> must be excluded
					],
				},
			],
		});
		stubDelegate("notification", {
			createMany: async (args: { data: unknown[] }) => {
				createdPayloads.push(...args.data);
				return { count: args.data.length };
			},
		});

		const notified = await dispatchAttendanceChangeAlerts(1, 999, [
			{
				id: 55,
				studentId: 10,
				date: parseLocalDateToUtcMidnight("2026-11-26"),
				oldStatus: null,
				oldRemarks: null,
				newStatus: "ABSENT",
				newRemarks: "No show",
				student: { firstName: "Ayesha", lastName: "Rahman" },
				enrollment: { class: { id: 2, name: "Class 5" }, section: null },
			},
			{
				id: 56,
				studentId: 10,
				date: parseLocalDateToUtcMidnight("2026-11-26"),
				oldStatus: null,
				oldRemarks: null,
				newStatus: "PRESENT",
				newRemarks: null,
				student: { firstName: "Ayesha", lastName: "Rahman" },
				enrollment: { class: { id: 2, name: "Class 5" }, section: null },
			},
		]);

		assert.equal(notified, 1);
		assert.equal(createdPayloads.length, 1);
		const notif = createdPayloads[0] as {
			recipientId: number;
			type: string;
			metadata: Record<string, unknown>;
		};
		assert.equal(notif.recipientId, 101);
		assert.equal(notif.type, "ATTENDANCE");
		assert.equal(notif.metadata.studentId, 10);
		assert.equal(notif.metadata.attendanceId, 55);
		assert.equal(notif.metadata.status, "ABSENT");
		assert.equal(notif.metadata.date, "2026-11-26");
		assert.equal(notif.metadata.severity, "danger");
	});
});

describe("3. Teacher scope & edit window (Rule 4)", () => {
	it("allows teachers to edit today and previous 3 days only; allows Admin any date", () => {
		assert.equal(isWithinTeacherEditWindow("2026-11-26", "2026-11-26"), true);
		assert.equal(isWithinTeacherEditWindow("2026-11-23", "2026-11-26"), true);
		assert.equal(isWithinTeacherEditWindow("2026-11-22", "2026-11-26"), false);
		assert.equal(isWithinTeacherEditWindow("2026-11-27", "2026-11-26"), false);

		assert.doesNotThrow(() =>
			assertDateEditableByActor({ userId: 1, role: "ADMIN" }, "2025-01-01"),
		);
		assert.throws(
			() =>
				assertDateEditableByActor({ userId: 2, role: "TEACHER" }, "2020-01-01"),
			/today and the previous 3 days/i,
		);
	});

	it("enforces TeacherAssignment class/section scoping", async () => {
		stubDelegate("teacher", {
			findFirst: async () => ({ id: 7 }),
		});
		stubDelegate("teacherAssignment", {
			findMany: async () => [{ classId: 3, sectionId: 10 }],
		});

		await assert.doesNotReject(() =>
			assertTeacherCanAccessEnrollments(1, { userId: 20, role: "TEACHER" }, [
				{ classId: 3, sectionId: 10 },
			]),
		);

		await assert.rejects(
			() =>
				assertTeacherCanAccessEnrollments(1, { userId: 20, role: "TEACHER" }, [
					{ classId: 4, sectionId: 10 },
				]),
			/assigned classes\/sections/i,
		);

		const where = buildTeacherEnrollmentScopeWhere([
			{ classId: 3, sectionId: 10 },
		]);
		assert.ok(Array.isArray(where.OR));
		assert.equal(where.OR?.length, 1);
	});
});

describe("4. Guardian scope", () => {
	it("blocks guardian from viewing unlinked student attendance in DB-level filter", async () => {
		stubDelegate("guardian", {
			findFirst: async () => ({
				students: [{ studentId: 11 }, { studentId: 12 }],
			}),
		});

		const res = await getAttendances(
			1,
			{ userId: 50, role: "GUARDIAN" },
			{ studentId: 99 },
		);
		assert.deepEqual(res.records, []);
		assert.equal(res.meta.total, 0);
	});

	it("blocks guardian from submitting leave request for unlinked student", async () => {
		stubDelegate("guardian", {
			findFirst: async () => ({
				students: [{ studentId: 11 }],
			}),
		});

		const today = getSchoolTodayStr();
		await assert.rejects(
			() =>
				createLeaveRequest(
					1,
					{ userId: 50, role: "GUARDIAN" },
					{
						studentId: 99,
						fromDate: today,
						toDate: today,
						reason: "Family visit",
					},
				),
			/own linked students/i,
		);
	});
});

describe("5. Holiday & weekly-off blocking (Rule 2)", () => {
	it("blocks marking attendance on a school holiday or weekly-off day", async () => {
		stubDelegate("schoolSetting", {
			findUnique: async () => ({ weeklyOffDays: [5] }),
		});
		stubDelegate("schoolHoliday", {
			findUnique: async () => ({ title: "Victory Day" }),
		});

		await assert.rejects(
			() => assertWorkingDay(1, "2026-12-16"),
			/school holiday.*Victory Day/i,
		);

		stubDelegate("schoolHoliday", {
			findUnique: async () => null,
		});

		// 2026-11-27 is Friday
		await assert.rejects(
			() => assertWorkingDay(1, "2026-11-27"),
			/weekly-off day/i,
		);

		// 2026-11-26 is Thursday -> allowed
		await assert.doesNotReject(() => assertWorkingDay(1, "2026-11-26"));
	});
});

describe("6. Leave approval & cancellation flow", () => {
	it("rejects leave requests exceeding 30 days in validation", () => {
		const today = getSchoolTodayStr();
		const [y, m, d] = today.split("-").map(Number);
		const future = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + 35));
		const tooFar = `${future.getUTCFullYear()}-${String(future.getUTCMonth() + 1).padStart(2, "0")}-${String(future.getUTCDate()).padStart(2, "0")}`;

		const parsed = createLeaveRequestSchema.safeParse({
			params: { schoolId: 1 },
			body: {
				studentId: 11,
				fromDate: today,
				toDate: tooFar,
				reason: "Long trip",
			},
		});
		assert.equal(parsed.success, false);
	});

	it("prevents guardian from cancelling an already approved leave request", async () => {
		stubDelegate("leaveRequest", {
			findFirst: async () => ({
				id: 7,
				schoolId: 1,
				studentId: 11,
				requestedBy: 50,
				status: "APPROVED",
			}),
		});
		stubDelegate("guardian", {
			findFirst: async () => ({
				students: [{ studentId: 11 }],
			}),
		});

		await assert.rejects(
			() => cancelLeaveRequest(1, 7, { userId: 50, role: "GUARDIAN" }),
			/Only pending leave requests can be cancelled/i,
		);
	});

	it("allows Admin to approve PENDING leave request and notifies guardian", async () => {
		const notifData: unknown[] = [];
		stubDelegate("leaveRequest", {
			findFirst: async () => ({
				id: 8,
				schoolId: 1,
				studentId: 11,
				requestedBy: 50,
				fromDate: parseLocalDateToUtcMidnight("2026-11-28"),
				toDate: parseLocalDateToUtcMidnight("2026-11-29"),
				reason: "Fever",
				status: "PENDING",
				student: {
					id: 11,
					studentId: "ST-11",
					firstName: "Tariq",
					lastName: "Islam",
					enrollments: [{ classId: 2, sectionId: 3 }],
				},
			}),
			update: async () => ({
				id: 8,
				schoolId: 1,
				studentId: 11,
				requestedBy: 50,
				status: "APPROVED",
				reviewNote: "Get well soon",
			}),
		});
		stubDelegate("guardianStudent", {
			findMany: async () => [{ guardian: { userId: 50 } }],
		});
		stubDelegate("notification", {
			createMany: async (args: { data: unknown[] }) => {
				notifData.push(...args.data);
				return { count: args.data.length };
			},
		});

		const res = await reviewLeaveRequest(
			1,
			8,
			{ userId: 1, role: "ADMIN" },
			{ status: "APPROVED", reviewNote: "Get well soon" },
		);
		assert.equal(res.status, "APPROVED");
		assert.equal(notifData.length, 1);
	});
});

describe("7. Cross-school multi-tenant isolation", () => {
	it("scopes getAttendanceById and deleteAttendance strictly by schoolId", async () => {
		let capturedWhere: Record<string, unknown> | undefined;
		stubDelegate("attendance", {
			findFirst: async (args: { where: Record<string, unknown> }) => {
				capturedWhere = args.where;
				return null; // record belongs to school 2, not school 1
			},
		});

		await assert.rejects(
			() => getAttendanceById(1, 42, { userId: 1, role: "ADMIN" }),
			/not found/i,
		);
		assert.deepEqual(capturedWhere, { id: 42, schoolId: 1 });

		await assert.rejects(() => deleteAttendance(1, 42), /not found/i);
		assert.deepEqual(capturedWhere, { id: 42, schoolId: 1 });
	});
});
