import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import {
	diffCalendarDays,
	formatUtcMidnightToLocalStr,
	getSchoolTodayStr,
	parseLocalDateToUtcMidnight,
} from "../../utils/attendanceDate.js";
import { resolveScopedStudentIds } from "../../utils/ownershipScope.js";
import {
	assertTeacherCanAccessEnrollments,
	buildTeacherEnrollmentScopeWhere,
	getTeacherAssignedPairs,
} from "./helpers.js";
import type {
	AuthActor,
	CreateLeaveRequestInput,
	LeaveRequestFilterQuery,
	ReviewLeaveRequestInput,
} from "./interface.js";

const leaveInclude = {
	student: {
		select: {
			id: true,
			studentId: true,
			firstName: true,
			lastName: true,
			enrollments: {
				where: { status: "ACTIVE" as const },
				take: 1,
				select: {
					classId: true,
					sectionId: true,
					class: { select: { id: true, name: true } },
					section: { select: { id: true, name: true } },
				},
			},
		},
	},
	requestedByUser: { select: { id: true, name: true, role: true } },
	reviewedByUser: { select: { id: true, name: true, role: true } },
} as const;

export const createLeaveRequest = async (
	schoolId: number,
	actor: AuthActor,
	payload: CreateLeaveRequestInput,
) => {
	if (actor.role !== "GUARDIAN") {
		throw new AppError(403, "Only guardians can submit leave requests");
	}

	const allowedIds = (await resolveScopedStudentIds(schoolId, actor)) ?? [];
	if (!allowedIds.includes(payload.studentId)) {
		throw new AppError(
			403,
			"You can only request leave for your own linked students",
		);
	}

	const today = getSchoolTodayStr();
	if (diffCalendarDays(payload.fromDate, today) < 0) {
		throw new AppError(400, "Leave start date must be today or in the future");
	}
	const span = diffCalendarDays(payload.toDate, payload.fromDate);
	if (span < 0 || span > 29) {
		throw new AppError(400, "Leave duration must be between 1 and 30 days");
	}

	const fromUtc = parseLocalDateToUtcMidnight(payload.fromDate);
	const toUtc = parseLocalDateToUtcMidnight(payload.toDate);

	const created = await prisma.leaveRequest.create({
		data: {
			schoolId,
			studentId: payload.studentId,
			requestedBy: actor.userId,
			fromDate: fromUtc,
			toDate: toUtc,
			reason: payload.reason.trim(),
			status: "PENDING",
		},
		include: leaveInclude,
	});

	// Notify school admins, managers, and assigned teachers
	try {
		const activeEn = created.student.enrollments[0];
		const [staffUsers, assignedTeachers] = await Promise.all([
			prisma.user.findMany({
				where: {
					schoolId,
					role: { in: ["ADMIN", "MANAGER"] },
					status: "ACTIVE",
				},
				select: { id: true },
			}),
			activeEn
				? prisma.teacherAssignment.findMany({
						where: {
							schoolId,
							classId: activeEn.classId,
							...(activeEn.sectionId !== null
								? { sectionId: activeEn.sectionId }
								: {}),
							isActive: true,
						},
						select: { teacher: { select: { userId: true } } },
					})
				: Promise.resolve([]),
		]);

		const recipientIds = new Set<number>();
		for (const u of staffUsers) recipientIds.add(u.id);
		for (const t of assignedTeachers) {
			if (t.teacher.userId) recipientIds.add(t.teacher.userId);
		}
		recipientIds.delete(actor.userId);

		if (recipientIds.size > 0) {
			const fullName =
				`${created.student.firstName} ${created.student.lastName ?? ""}`.trim();
			const notifications: Prisma.NotificationCreateManyInput[] = Array.from(
				recipientIds,
			).map((recipientId) => ({
				schoolId,
				recipientId,
				title: `New Leave Request: ${fullName}`,
				message: `${fullName} requested leave from ${payload.fromDate} to ${payload.toDate}. Reason: ${created.reason}`,
				type: "ATTENDANCE",
				metadata: {
					leaveRequestId: created.id,
					studentId: created.studentId,
					fromDate: payload.fromDate,
					toDate: payload.toDate,
					status: "PENDING",
				},
			}));
			await prisma.notification.createMany({ data: notifications });
		}
	} catch (err) {
		console.error("Failed to notify staff of leave request:", err);
	}

	return created;
};

export const getLeaveRequests = async (
	schoolId: number,
	actor: AuthActor,
	query: LeaveRequestFilterQuery,
) => {
	const andConditions: Prisma.LeaveRequestWhereInput[] = [{ schoolId }];

	if (actor.role === "GUARDIAN" || actor.role === "STUDENT") {
		const allowedIds = (await resolveScopedStudentIds(schoolId, actor)) ?? [];
		if (allowedIds.length === 0) return [];
		if (
			query.studentId !== undefined &&
			!allowedIds.includes(query.studentId)
		) {
			return [];
		}
		andConditions.push({
			studentId:
				query.studentId !== undefined ? query.studentId : { in: allowedIds },
		});
	} else if (actor.role === "TEACHER") {
		const pairs = await getTeacherAssignedPairs(schoolId, actor);
		if (pairs.length === 0) return [];
		andConditions.push({
			student: {
				enrollments: {
					some: {
						schoolId,
						status: "ACTIVE",
						...buildTeacherEnrollmentScopeWhere(pairs),
					},
				},
			},
		});
		if (query.studentId !== undefined) {
			andConditions.push({ studentId: query.studentId });
		}
	} else if (query.studentId !== undefined) {
		andConditions.push({ studentId: query.studentId });
	}

	if (query.status !== undefined) {
		andConditions.push({ status: query.status });
	}
	if (query.classId !== undefined || query.sectionId !== undefined) {
		andConditions.push({
			student: {
				enrollments: {
					some: {
						schoolId,
						status: "ACTIVE",
						...(query.classId !== undefined ? { classId: query.classId } : {}),
						...(query.sectionId !== undefined
							? { sectionId: query.sectionId }
							: {}),
					},
				},
			},
		});
	}

	return prisma.leaveRequest.findMany({
		where: { AND: andConditions },
		include: leaveInclude,
		orderBy: [{ createdAt: "desc" }],
	});
};

export const cancelLeaveRequest = async (
	schoolId: number,
	id: number,
	actor: AuthActor,
) => {
	if (actor.role !== "GUARDIAN") {
		throw new AppError(403, "Only guardians can cancel their leave requests");
	}

	const existing = await prisma.leaveRequest.findFirst({
		where: { id, schoolId },
	});

	if (!existing) {
		throw new AppError(404, "Leave request not found");
	}

	const allowedIds = (await resolveScopedStudentIds(schoolId, actor)) ?? [];
	if (
		existing.requestedBy !== actor.userId &&
		!allowedIds.includes(existing.studentId)
	) {
		throw new AppError(
			403,
			"You do not have permission to cancel this leave request",
		);
	}

	if (existing.status !== "PENDING") {
		throw new AppError(400, "Only pending leave requests can be cancelled");
	}

	return prisma.leaveRequest.delete({ where: { id } });
};

export const reviewLeaveRequest = async (
	schoolId: number,
	id: number,
	actor: AuthActor,
	payload: ReviewLeaveRequestInput,
) => {
	const existing = await prisma.leaveRequest.findFirst({
		where: { id, schoolId },
		include: leaveInclude,
	});

	if (!existing) {
		throw new AppError(404, "Leave request not found");
	}

	if (existing.status !== "PENDING") {
		throw new AppError(400, "This leave request has already been reviewed");
	}

	if (actor.role === "TEACHER") {
		const activeEn = existing.student.enrollments[0];
		if (!activeEn) {
			throw new AppError(
				403,
				"Student does not have an active enrollment in your assigned classes",
			);
		}
		await assertTeacherCanAccessEnrollments(schoolId, actor, [
			{ classId: activeEn.classId, sectionId: activeEn.sectionId },
		]);
	}

	const updated = await prisma.leaveRequest.update({
		where: { id },
		data: {
			status: payload.status,
			reviewedBy: actor.userId,
			reviewNote: payload.reviewNote?.trim() || null,
			reviewedAt: new Date(),
		},
		include: leaveInclude,
	});

	// Notify the requesting guardian (and any linked guardians except actor)
	try {
		const guardians = await prisma.guardianStudent.findMany({
			where: { studentId: existing.studentId },
			select: { guardian: { select: { userId: true } } },
		});
		const recipientIds = new Set<number>([existing.requestedBy]);
		for (const g of guardians) {
			if (g.guardian.userId) recipientIds.add(g.guardian.userId);
		}
		recipientIds.delete(actor.userId);

		if (recipientIds.size > 0) {
			const fullName =
				`${existing.student.firstName} ${existing.student.lastName ?? ""}`.trim();
			const fromStr = formatUtcMidnightToLocalStr(existing.fromDate);
			const toStr = formatUtcMidnightToLocalStr(existing.toDate);
			const noteSuffix = updated.reviewNote
				? ` Note: ${updated.reviewNote}`
				: "";

			const notifications: Prisma.NotificationCreateManyInput[] = Array.from(
				recipientIds,
			).map((recipientId) => ({
				schoolId,
				recipientId,
				title: `Leave Request ${payload.status}: ${fullName}`,
				message: `Leave request for ${fullName} (${fromStr} to ${toStr}) was ${payload.status.toLowerCase()}.${noteSuffix}`,
				type: "ATTENDANCE",
				metadata: {
					leaveRequestId: updated.id,
					studentId: updated.studentId,
					fromDate: fromStr,
					toDate: toStr,
					status: payload.status,
				},
			}));
			await prisma.notification.createMany({ data: notifications });
		}
	} catch (err) {
		console.error("Failed to notify guardian of leave review:", err);
	}

	return updated;
};
