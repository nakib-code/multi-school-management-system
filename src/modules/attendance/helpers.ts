import type {
	AttendanceStatus,
	Prisma,
} from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	DEFAULT_WEEKLY_OFF_DAYS,
	formatUtcMidnightToLocalStr,
	getDayOfWeek,
	isWithinTeacherEditWindow,
	parseLocalDateToUtcMidnight,
	shouldNotifyGuardianForChange,
} from "../../utils/attendanceDate.js";
import { resolveScopedTeacherId } from "../../utils/ownershipScope.js";
import type { AuthActor } from "./interface.js";

export const attendanceInclude = {
	student: {
		select: { id: true, studentId: true, firstName: true, lastName: true },
	},
	enrollment: {
		select: {
			id: true,
			academicYear: true,
			rollNumber: true,
			class: { select: { id: true, name: true } },
			section: { select: { id: true, name: true } },
		},
	},
	markedByUser: { select: { id: true, name: true, role: true } },
} as const;

export interface TeacherClassSectionPair {
	classId: number;
	sectionId: number | null;
}

export async function getTeacherAssignedPairs(
	schoolId: number,
	actor: AuthActor,
): Promise<TeacherClassSectionPair[]> {
	const teacherId = await resolveScopedTeacherId(schoolId, actor);
	if (!teacherId || teacherId < 0) {
		return [];
	}

	const assignments = await prisma.teacherAssignment.findMany({
		where: { schoolId, teacherId, isActive: true },
		select: { classId: true, sectionId: true },
	});

	return assignments;
}

export function buildTeacherEnrollmentScopeWhere(
	pairs: TeacherClassSectionPair[],
): Prisma.EnrollmentWhereInput {
	if (pairs.length === 0) {
		return { id: -1 };
	}

	return {
		OR: pairs.map((a) =>
			a.sectionId !== null
				? {
						classId: a.classId,
						OR: [{ sectionId: a.sectionId }, { sectionId: null }],
					}
				: { classId: a.classId },
		),
	};
}

export async function assertTeacherCanAccessEnrollments(
	schoolId: number,
	actor: AuthActor,
	enrollments: Array<{ classId: number; sectionId: number | null }>,
): Promise<void> {
	if (actor.role !== "TEACHER") return;

	const pairs = await getTeacherAssignedPairs(schoolId, actor);
	if (pairs.length === 0) {
		throw new AppError(
			403,
			"You have no active class assignments to access or mark attendance",
		);
	}

	for (const en of enrollments) {
		const allowed = pairs.some(
			(a) =>
				a.classId === en.classId &&
				(en.sectionId === null ||
					a.sectionId === null ||
					a.sectionId === en.sectionId),
		);
		if (!allowed) {
			throw new AppError(
				403,
				"You can only access or mark attendance for students in your assigned classes/sections",
			);
		}
	}
}

export function assertDateEditableByActor(
	actor: AuthActor,
	dateStr: string,
): void {
	if (actor.role !== "TEACHER") return;

	if (!isWithinTeacherEditWindow(dateStr)) {
		throw new AppError(
			403,
			"Teachers can only mark or edit attendance for today and the previous 3 days",
		);
	}
}

export async function getSchoolWeeklyOffDays(
	schoolId: number,
): Promise<number[]> {
	const setting = await prisma.schoolSetting.findUnique({
		where: { schoolId },
		select: { weeklyOffDays: true },
	});
	if (!setting || setting.weeklyOffDays.length === 0) {
		return [...DEFAULT_WEEKLY_OFF_DAYS];
	}
	return setting.weeklyOffDays;
}

export async function checkWorkingDayStatus(
	schoolId: number,
	dateStr: string,
): Promise<{
	isWorkingDay: boolean;
	isWeeklyOff: boolean;
	isHoliday: boolean;
	holidayTitle: string | null;
	weeklyOffDays: number[];
}> {
	const utcDate = parseLocalDateToUtcMidnight(dateStr);
	const [weeklyOffDays, holiday] = await Promise.all([
		getSchoolWeeklyOffDays(schoolId),
		prisma.schoolHoliday.findUnique({
			where: { schoolId_date: { schoolId, date: utcDate } },
			select: { title: true },
		}),
	]);

	const dow = getDayOfWeek(dateStr);
	const isWeeklyOff = weeklyOffDays.includes(dow);
	const isHoliday = Boolean(holiday);

	return {
		isWorkingDay: !isWeeklyOff && !isHoliday,
		isWeeklyOff,
		isHoliday,
		holidayTitle: holiday?.title ?? null,
		weeklyOffDays,
	};
}

export async function assertWorkingDay(
	schoolId: number,
	dateStr: string,
): Promise<void> {
	const status = await checkWorkingDayStatus(schoolId, dateStr);
	if (status.isHoliday) {
		throw new AppError(
			400,
			`Cannot mark attendance on school holiday (${status.holidayTitle ?? dateStr})`,
		);
	}
	if (status.isWeeklyOff) {
		throw new AppError(
			400,
			`Cannot mark attendance on a weekly-off day (${dateStr})`,
		);
	}
}

export interface AttendanceChangeForAlert {
	id: number;
	studentId: number;
	date: Date;
	oldStatus: AttendanceStatus | null;
	oldRemarks: string | null;
	newStatus: AttendanceStatus;
	newRemarks: string | null;
	student: { firstName: string; lastName: string | null };
	enrollment: {
		class: { id: number; name: string };
		section: { id: number; name: string } | null;
	};
}

/**
 * Rule 5:
 * - Notifications go to the student's linked guardians ONLY.
 * - Only when status/remarks CHANGED to ABSENT, LATE or EXCUSED (or changed away from those).
 * - Never notify for PRESENT on initial mark.
 * - Never notify when a re-save did not change status/remarks.
 * - Never notify the actor.
 */
export async function dispatchAttendanceChangeAlerts(
	schoolId: number,
	actorUserId: number,
	changes: AttendanceChangeForAlert[],
): Promise<number> {
	const alertable = changes.filter((c) =>
		shouldNotifyGuardianForChange(
			c.oldStatus,
			c.oldRemarks,
			c.newStatus,
			c.newRemarks,
		),
	);

	if (alertable.length === 0) return 0;

	const studentIds = Array.from(new Set(alertable.map((r) => r.studentId)));
	const students = await prisma.student.findMany({
		where: { id: { in: studentIds }, schoolId },
		select: {
			id: true,
			guardians: {
				select: { guardian: { select: { userId: true } } },
			},
		},
	});

	const guardiansByStudent = new Map<number, number[]>();
	for (const s of students) {
		const ids = new Set<number>();
		for (const g of s.guardians) {
			if (g.guardian.userId && g.guardian.userId !== actorUserId) {
				ids.add(g.guardian.userId);
			}
		}
		guardiansByStudent.set(s.id, Array.from(ids));
	}

	const notifications: Prisma.NotificationCreateManyInput[] = [];
	const notifiedGuardianIds = new Set<number>();

	for (const rec of alertable) {
		const recipientIds = guardiansByStudent.get(rec.studentId) ?? [];
		if (recipientIds.length === 0) continue;

		const fullName =
			`${rec.student.firstName} ${rec.student.lastName ?? ""}`.trim();
		const dateStr = formatUtcMidnightToLocalStr(rec.date);
		const classLabel = rec.enrollment.section
			? `${rec.enrollment.class.name} (${rec.enrollment.section.name})`
			: rec.enrollment.class.name;

		const wasCorrection =
			rec.oldStatus !== null && rec.oldStatus !== rec.newStatus;
		const title = wasCorrection
			? `Attendance Updated: ${fullName} — ${rec.newStatus}`
			: `Attendance Alert: ${fullName} — ${rec.newStatus}`;

		const remarksText = rec.newRemarks ? ` Remarks: ${rec.newRemarks}` : "";
		const message = wasCorrection
			? `${fullName} (${classLabel}) attendance on ${dateStr} changed from ${rec.oldStatus} to ${rec.newStatus}.${remarksText}`
			: `${fullName} (${classLabel}) was marked ${rec.newStatus} on ${dateStr}.${remarksText}`;

		const severity =
			rec.newStatus === "ABSENT"
				? "danger"
				: rec.newStatus === "LATE"
					? "warning"
					: "info";

		const metadata: Prisma.InputJsonValue = {
			attendanceId: rec.id,
			studentId: rec.studentId,
			date: dateStr,
			status: rec.newStatus,
			previousStatus: rec.oldStatus,
			classId: rec.enrollment.class.id,
			severity,
		};

		for (const recipientId of recipientIds) {
			notifiedGuardianIds.add(recipientId);
			notifications.push({
				schoolId,
				recipientId,
				title,
				message,
				type: "ATTENDANCE",
				metadata,
			});
		}
	}

	const chunkSize = 500;
	for (let i = 0; i < notifications.length; i += chunkSize) {
		await prisma.notification.createMany({
			data: notifications.slice(i, i + chunkSize),
		});
	}

	return notifiedGuardianIds.size;
}
