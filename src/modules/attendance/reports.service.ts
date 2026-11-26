import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	calculateAttendanceRate,
	countWorkingDaysInMonth,
	formatUtcMidnightToLocalStr,
	getMonthDateBounds,
	getSchoolTodayStr,
} from "../../utils/attendanceDate.js";
import { resolveScopedStudentIds } from "../../utils/ownershipScope.js";
import { getSchoolWeeklyOffDays } from "./helpers.js";
import type {
	AuthActor,
	MonthlyReportQuery,
	PublishMonthlyReportInput,
} from "./interface.js";

export interface MonthlyReportStudentRow {
	studentId: number;
	studentCode: string;
	firstName: string;
	lastName: string | null;
	nameBangla: string | null;
	rollNumber: number | null;
	present: number;
	absent: number;
	late: number;
	excused: number;
	workingDays: number;
	percent: number;
}

export const getMonthlyAttendanceReport = async (
	schoolId: number,
	query: MonthlyReportQuery,
) => {
	const bounds = getMonthDateBounds(query.month);
	const todayStr = getSchoolTodayStr();

	const [
		classRecord,
		sectionRecord,
		weeklyOffDays,
		holidays,
		enrollments,
		reportMeta,
	] = await Promise.all([
		prisma.schoolClass.findFirst({
			where: { id: query.classId, schoolId },
			select: { id: true, name: true },
		}),
		query.sectionId !== undefined
			? prisma.section.findFirst({
					where: { id: query.sectionId, classId: query.classId, schoolId },
					select: { id: true, name: true },
				})
			: Promise.resolve(null),
		getSchoolWeeklyOffDays(schoolId),
		prisma.schoolHoliday.findMany({
			where: {
				schoolId,
				date: { gte: bounds.fromDate, lte: bounds.toDate },
			},
			select: { date: true, title: true },
		}),
		prisma.enrollment.findMany({
			where: {
				schoolId,
				classId: query.classId,
				...(query.sectionId !== undefined
					? { sectionId: query.sectionId }
					: {}),
				status: "ACTIVE",
			},
			select: {
				id: true,
				studentId: true,
				rollNumber: true,
				student: {
					select: {
						id: true,
						studentId: true,
						firstName: true,
						lastName: true,
						nameBangla: true,
					},
				},
			},
			orderBy: [{ rollNumber: "asc" }, { studentId: "asc" }],
		}),
		prisma.monthlyReport.findFirst({
			where: {
				schoolId,
				month: query.month,
				classId: query.classId,
				sectionId: query.sectionId ?? null,
			},
			include: {
				publishedByUser: { select: { id: true, name: true } },
			},
		}),
	]);

	if (!classRecord) {
		throw new AppError(404, "Class not found in this school");
	}
	if (query.sectionId !== undefined && !sectionRecord) {
		throw new AppError(404, "Section not found in this class");
	}

	const holidaySet = new Set(
		holidays.map((h) => formatUtcMidnightToLocalStr(h.date)),
	);
	const { workingDays } = countWorkingDaysInMonth(
		query.month,
		weeklyOffDays,
		holidaySet,
		todayStr,
	);

	const studentIds = enrollments.map((e) => e.studentId);

	// Use groupBy aggregation — never row-by-row queries
	const grouped =
		studentIds.length > 0
			? await prisma.attendance.groupBy({
					by: ["studentId", "status"],
					where: {
						schoolId,
						studentId: { in: studentIds },
						date: { gte: bounds.fromDate, lte: bounds.toDate },
					},
					_count: { _all: true },
				})
			: [];

	const countsByStudent = new Map<
		number,
		{ present: number; absent: number; late: number; excused: number }
	>();
	for (const g of grouped) {
		const entry = countsByStudent.get(g.studentId) ?? {
			present: 0,
			absent: 0,
			late: 0,
			excused: 0,
		};
		if (g.status === "PRESENT") entry.present += g._count._all;
		else if (g.status === "ABSENT") entry.absent += g._count._all;
		else if (g.status === "LATE") entry.late += g._count._all;
		else if (g.status === "EXCUSED") entry.excused += g._count._all;
		countsByStudent.set(g.studentId, entry);
	}

	let totalPresent = 0;
	let totalAbsent = 0;
	let totalLate = 0;
	let totalExcused = 0;

	const rows: MonthlyReportStudentRow[] = enrollments.map((en) => {
		const c = countsByStudent.get(en.studentId) ?? {
			present: 0,
			absent: 0,
			late: 0,
			excused: 0,
		};
		totalPresent += c.present;
		totalAbsent += c.absent;
		totalLate += c.late;
		totalExcused += c.excused;

		const percent = calculateAttendanceRate(
			c.present,
			c.late,
			c.excused,
			workingDays,
		);

		return {
			studentId: en.studentId,
			studentCode: en.student.studentId,
			firstName: en.student.firstName,
			lastName: en.student.lastName,
			nameBangla: en.student.nameBangla,
			rollNumber: en.rollNumber,
			present: c.present,
			absent: c.absent,
			late: c.late,
			excused: c.excused,
			workingDays,
			percent,
		};
	});

	const averagePercent =
		rows.length > 0
			? Math.round(
					(rows.reduce((sum, r) => sum + r.percent, 0) / rows.length) * 10,
				) / 10
			: 0;

	return {
		month: query.month,
		class: classRecord,
		section: sectionRecord,
		workingDays,
		status: reportMeta?.publishedAt
			? ("PUBLISHED" as const)
			: ("DRAFT" as const),
		publishedAt: reportMeta?.publishedAt ?? null,
		publishedBy: reportMeta?.publishedByUser ?? null,
		totals: {
			students: rows.length,
			present: totalPresent,
			absent: totalAbsent,
			late: totalLate,
			excused: totalExcused,
			averagePercent,
		},
		rows,
	};
};

export const publishMonthlyAttendanceReport = async (
	schoolId: number,
	actor: AuthActor,
	payload: PublishMonthlyReportInput,
) => {
	const reportData = await getMonthlyAttendanceReport(schoolId, payload);
	const now = new Date();

	const sectionIdValue = payload.sectionId ?? null;

	const savedReport = await prisma.$transaction(async (tx) => {
		const existing = await tx.monthlyReport.findFirst({
			where: {
				schoolId,
				month: payload.month,
				classId: payload.classId,
				sectionId: sectionIdValue,
			},
		});

		if (existing) {
			return tx.monthlyReport.update({
				where: { id: existing.id },
				data: { publishedAt: now, publishedBy: actor.userId },
			});
		}

		return tx.monthlyReport.create({
			data: {
				schoolId,
				month: payload.month,
				classId: payload.classId,
				sectionId: sectionIdValue,
				publishedAt: now,
				publishedBy: actor.userId,
			},
		});
	});

	// Send ONE notification per guardian (aggregating if they have multiple children in this report)
	const studentIds = reportData.rows.map((r) => r.studentId);
	let notifiedGuardians = 0;

	if (studentIds.length > 0) {
		const students = await prisma.student.findMany({
			where: { schoolId, id: { in: studentIds } },
			select: {
				id: true,
				guardians: {
					select: { guardian: { select: { userId: true } } },
				},
			},
		});

		const rowByStudent = new Map(reportData.rows.map((r) => [r.studentId, r]));
		const guardianEntries = new Map<
			number,
			Array<{ studentId: number; name: string; percent: number }>
		>();

		for (const st of students) {
			const row = rowByStudent.get(st.id);
			if (!row) continue;
			const fullName = `${row.firstName} ${row.lastName ?? ""}`.trim();
			for (const g of st.guardians) {
				const uid = g.guardian.userId;
				if (!uid || uid === actor.userId) continue;
				const list = guardianEntries.get(uid) ?? [];
				list.push({ studentId: st.id, name: fullName, percent: row.percent });
				guardianEntries.set(uid, list);
			}
		}

		const notifications: Prisma.NotificationCreateManyInput[] = [];
		for (const [recipientId, children] of guardianEntries.entries()) {
			const summaryText = children
				.map((c) => `${c.name}: ${c.percent}%`)
				.join(", ");
			notifications.push({
				schoolId,
				recipientId,
				title: `Monthly Attendance Report Published (${payload.month})`,
				message: `Attendance report for ${payload.month} is now available — ${summaryText}.`,
				type: "ATTENDANCE",
				metadata: {
					reportId: savedReport.id,
					month: payload.month,
					classId: payload.classId,
					sectionId: sectionIdValue,
					children,
				},
			});
		}

		if (notifications.length > 0) {
			const chunkSize = 500;
			for (let i = 0; i < notifications.length; i += chunkSize) {
				await prisma.notification.createMany({
					data: notifications.slice(i, i + chunkSize),
				});
			}
			notifiedGuardians = notifications.length;
		}
	}

	return {
		report: savedReport,
		notifiedGuardians,
	};
};

export const getPublishedReportsForGuardian = async (
	schoolId: number,
	actor: AuthActor,
	studentIdFilter?: number,
) => {
	const allowedIds = (await resolveScopedStudentIds(schoolId, actor)) ?? [];
	if (allowedIds.length === 0) return [];

	const targetIds =
		studentIdFilter !== undefined
			? allowedIds.includes(studentIdFilter)
				? [studentIdFilter]
				: []
			: allowedIds;

	if (targetIds.length === 0) return [];

	const enrollments = await prisma.enrollment.findMany({
		where: { schoolId, studentId: { in: targetIds }, status: "ACTIVE" },
		select: {
			studentId: true,
			classId: true,
			sectionId: true,
			student: {
				select: { id: true, firstName: true, lastName: true, studentId: true },
			},
			class: { select: { id: true, name: true } },
			section: { select: { id: true, name: true } },
		},
	});

	if (enrollments.length === 0) return [];

	const classIds = Array.from(new Set(enrollments.map((e) => e.classId)));
	const published = await prisma.monthlyReport.findMany({
		where: {
			schoolId,
			classId: { in: classIds },
			publishedAt: { not: null },
		},
		include: {
			class: { select: { id: true, name: true } },
			section: { select: { id: true, name: true } },
		},
		orderBy: [{ month: "desc" }, { publishedAt: "desc" }],
	});

	const weeklyOffDays = await getSchoolWeeklyOffDays(schoolId);
	const todayStr = getSchoolTodayStr();

	const results = [];

	for (const rep of published) {
		const matchingEnrollments = enrollments.filter(
			(e) =>
				e.classId === rep.classId &&
				(rep.sectionId === null || e.sectionId === rep.sectionId),
		);
		if (matchingEnrollments.length === 0) continue;

		const bounds = getMonthDateBounds(rep.month);
		const holidays = await prisma.schoolHoliday.findMany({
			where: { schoolId, date: { gte: bounds.fromDate, lte: bounds.toDate } },
			select: { date: true },
		});
		const holidaySet = new Set(
			holidays.map((h) => formatUtcMidnightToLocalStr(h.date)),
		);
		const { workingDays } = countWorkingDaysInMonth(
			rep.month,
			weeklyOffDays,
			holidaySet,
			todayStr,
		);

		const grouped = await prisma.attendance.groupBy({
			by: ["studentId", "status"],
			where: {
				schoolId,
				studentId: { in: matchingEnrollments.map((e) => e.studentId) },
				date: { gte: bounds.fromDate, lte: bounds.toDate },
			},
			_count: { _all: true },
		});

		const countsByStudent = new Map<
			number,
			{ present: number; absent: number; late: number; excused: number }
		>();
		for (const g of grouped) {
			const c = countsByStudent.get(g.studentId) ?? {
				present: 0,
				absent: 0,
				late: 0,
				excused: 0,
			};
			if (g.status === "PRESENT") c.present += g._count._all;
			else if (g.status === "ABSENT") c.absent += g._count._all;
			else if (g.status === "LATE") c.late += g._count._all;
			else if (g.status === "EXCUSED") c.excused += g._count._all;
			countsByStudent.set(g.studentId, c);
		}

		for (const en of matchingEnrollments) {
			const c = countsByStudent.get(en.studentId) ?? {
				present: 0,
				absent: 0,
				late: 0,
				excused: 0,
			};
			results.push({
				reportId: rep.id,
				month: rep.month,
				publishedAt: rep.publishedAt,
				student: en.student,
				class: rep.class,
				section: rep.section,
				workingDays,
				...c,
				percent: calculateAttendanceRate(
					c.present,
					c.late,
					c.excused,
					workingDays,
				),
			});
		}
	}

	return results;
};
