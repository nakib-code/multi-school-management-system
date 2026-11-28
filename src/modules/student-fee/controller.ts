import type { NextFunction, Response } from "express";

import { prisma } from "../../lib/prisma.js";
import type { AuthRequest } from "../../middleware/auth.js";
import AppError from "../../utils/appError.js";
import { resolveScopedStudentIds } from "../../utils/ownershipScope.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordSchoolAudit } from "../audit-log/service.js";
import { createNotification } from "../notification/service.js";
import type { StudentFeeFilterQuery } from "./interface.js";
import {
	bulkCreateStudentFees,
	createStudentFee,
	deleteStudentFee,
	getStudentFeeById,
	getStudentFees,
	updateStudentFee,
} from "./service.js";

const parsePositiveInt = (value: unknown, label: string): number => {
	const num = Number(value);
	if (!Number.isInteger(num) || num <= 0) {
		throw new AppError(400, `Invalid ${label}`);
	}
	return num;
};

const notifyStudentsForNewFee = async (
	schoolId: number,
	feeTargets: Array<{ studentId: number; amount: number }>,
	title: string,
) => {
	const payableTargets = feeTargets.filter((t) => t.amount > 0);
	if (payableTargets.length === 0) return;

	const amountByStudent = new Map<number, number>();
	for (const t of payableTargets) {
		amountByStudent.set(t.studentId, t.amount);
	}
	const studentIds = [...amountByStudent.keys()];

	try {
		const [students, links] = await Promise.all([
			prisma.student.findMany({
				where: { id: { in: studentIds }, schoolId, userId: { not: null } },
				select: { id: true, userId: true },
			}),
			prisma.guardianStudent.findMany({
				where: { studentId: { in: studentIds }, guardian: { schoolId } },
				select: { studentId: true, guardian: { select: { userId: true } } },
			}),
		]);

		const notifications: Array<{ recipientId: number; amount: number }> = [];
		const seen = new Set<string>();

		for (const s of students) {
			const amt = amountByStudent.get(s.id);
			if (s.userId && amt !== undefined) {
				const key = `${s.userId}:${s.id}`;
				if (!seen.has(key)) {
					seen.add(key);
					notifications.push({ recipientId: s.userId, amount: amt });
				}
			}
		}
		for (const l of links) {
			const amt = amountByStudent.get(l.studentId);
			if (l.guardian.userId && amt !== undefined) {
				const key = `${l.guardian.userId}:${l.studentId}`;
				if (!seen.has(key)) {
					seen.add(key);
					notifications.push({ recipientId: l.guardian.userId, amount: amt });
				}
			}
		}

		await Promise.all(
			notifications.map(({ recipientId, amount }) =>
				createNotification({
					recipientId,
					schoolId,
					type: "FEE",
					title: "New Fee Invoice Issued",
					message: `A new fee invoice "${title}" of ৳${amount} has been issued. Please review and pay before the due date.`,
				}).catch(() => {}),
			),
		);
	} catch {
		// Non-fatal notification failure
	}
};

export const createStudentFeeController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await createStudentFee(schoolId, req.body);

		if (req.user?.userId) {
			await recordSchoolAudit({
				schoolId,
				userId: req.user.userId,
				action: "CREATE",
				entity: "StudentFee",
				entityId: result.id,
				description: `Created fee invoice "${result.title}" (৳${Number(result.amount)})`,
				ipAddress: req.ip ?? null,
				userAgent: req.headers["user-agent"] ?? null,
			}).catch(() => {});
		}

		if (Number(result.amount) > 0 && result.status !== "WAIVED") {
			await notifyStudentsForNewFee(
				schoolId,
				[{ studentId: result.studentId, amount: Number(result.amount) }],
				result.title,
			);
		}

		return sendResponse(res, {
			statusCode: 201,
			message: "Student fee created successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const bulkCreateStudentFeesController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const result = await bulkCreateStudentFees(schoolId, req.body);

		if (req.user?.userId) {
			await recordSchoolAudit({
				schoolId,
				userId: req.user.userId,
				action: "CREATE",
				entity: "StudentFee",
				description: `Bulk generated ${result.createdCount} fee invoice(s) "${req.body.title}" for ${result.className} (skipped ${result.skippedCount})`,
				ipAddress: req.ip ?? null,
				userAgent: req.headers["user-agent"] ?? null,
			}).catch(() => {});
		}

		await notifyStudentsForNewFee(
			schoolId,
			result.createdNotifications.map((n) => ({
				studentId: n.studentId,
				amount: n.netAmount,
			})),
			String(req.body.title ?? ""),
		);

		return sendResponse(res, {
			statusCode: 201,
			message: `Generated ${result.createdCount} fee invoice(s)${result.skippedCount > 0 ? ` (${result.skippedCount} duplicate skipped)` : ""}${result.concessionAppliedCount > 0 ? ` (${result.concessionAppliedCount} with concession)` : ""}`,
			data: {
				createdCount: result.createdCount,
				skippedCount: result.skippedCount,
				concessionAppliedCount: result.concessionAppliedCount,
				className: result.className,
				resolvedAmount: result.resolvedAmount,
			},
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentFeesController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const validated = res.locals.validatedRequest as
			| { query?: StudentFeeFilterQuery }
			| undefined;
		const allowedStudentIds = req.user
			? await resolveScopedStudentIds(schoolId, req.user)
			: null;
		const result = await getStudentFees(
			schoolId,
			validated?.query ?? {},
			allowedStudentIds,
		);
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fees retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const getStudentFeeByIdController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student fee ID");
		const result = await getStudentFeeById(schoolId, id);
		if (req.user) {
			const allowedStudentIds = await resolveScopedStudentIds(
				schoolId,
				req.user,
			);
			if (
				allowedStudentIds !== null &&
				!allowedStudentIds.includes(result.studentId)
			) {
				throw new AppError(
					403,
					"You do not have permission to view this student fee",
				);
			}
		}
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fee retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

export const updateStudentFeeController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student fee ID");
		const { fee, previous } = await updateStudentFee(
			schoolId,
			id,
			req.body,
			req.user ? { userId: req.user.userId, role: req.user.role } : undefined,
		);
		if (req.user?.userId) {
			await recordSchoolAudit({
				schoolId,
				userId: req.user.userId,
				action: "UPDATE",
				entity: "StudentFee",
				entityId: id,
				description: `Updated fee invoice #${id}: before [title="${previous.title}", ৳${previous.amount}, waived=৳${previous.waivedAmount}, status=${previous.status}] -> after [title="${fee.title}", ৳${Number(fee.amount)}, waived=৳${Number(fee.waivedAmount ?? 0)}, status=${fee.status}]`,
				ipAddress: req.ip ?? null,
				userAgent: req.headers["user-agent"] ?? null,
			}).catch(() => {});
		}
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fee updated successfully",
			data: fee,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteStudentFeeController = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const schoolId = parsePositiveInt(req.params.schoolId, "school ID");
		const id = parsePositiveInt(req.params.id, "student fee ID");
		const result = await deleteStudentFee(schoolId, id);
		if (req.user?.userId) {
			await recordSchoolAudit({
				schoolId,
				userId: req.user.userId,
				action: "DELETE",
				entity: "StudentFee",
				entityId: id,
				description: `Deleted fee invoice #${id} (${result.title})`,
				ipAddress: req.ip ?? null,
				userAgent: req.headers["user-agent"] ?? null,
			}).catch(() => {});
		}
		return sendResponse(res, {
			statusCode: 200,
			message: "Student fee deleted successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
};
