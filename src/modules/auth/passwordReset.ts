import crypto from "node:crypto";
import type { Request, Response } from "express";
import env from "../../config/env.js";
import { AuditAction } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { hashPassword } from "../../utils/password.js";
import { sendPasswordResetEmail } from "../../utils/sendEmail.js";
import sendResponse from "../../utils/sendResponse.js";
import { recordPlatformAudit } from "../platform-audit-log/service.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

const hashResetToken = (token: string): string =>
	crypto.createHash("sha256").update(token).digest("hex");

export const forgotPasswordController = async (req: Request, res: Response) => {
	const email = String(req.body.email ?? "")
		.trim()
		.toLowerCase();

	const genericMessage =
		"If an active account with that email exists, a password reset link has been sent.";

	const user = await prisma.user.findUnique({
		where: { email },
		select: { id: true, email: true, status: true, schoolId: true },
	});

	if (!user || user.status !== "ACTIVE") {
		return sendResponse(res, {
			statusCode: 200,
			message: genericMessage,
			data: { sent: true },
		});
	}

	const rawToken = crypto.randomBytes(32).toString("hex");
	const tokenHash = hashResetToken(rawToken);
	const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

	// Invalidate previous unused tokens for this user and create the new hashed token
	await prisma.$transaction([
		prisma.passwordResetToken.updateMany({
			where: { userId: user.id, usedAt: null },
			data: { usedAt: new Date() },
		}),
		prisma.passwordResetToken.create({
			data: {
				userId: user.id,
				tokenHash,
				expiresAt,
			},
		}),
	]);

	const frontendBase = (
		(env.frontend_url || "http://localhost:3000").split(",")[0]?.trim() ||
		"http://localhost:3000"
	).replace(/\/$/, "");
	const resetUrl = `${frontendBase}/auth/reset-password?token=${rawToken}`;

	try {
		await sendPasswordResetEmail(user.email, resetUrl);
	} catch (error) {
		console.error("Password reset email delivery failed:", error);
		// Do not leak email existence or token
	}

	await recordPlatformAudit({
		actorId: user.id,
		action: AuditAction.PASSWORD_CHANGE,
		entityType: "PasswordResetRequest",
		entityId: user.id,
		schoolId: user.schoolId,
		description: "Password reset link requested",
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		message: genericMessage,
		data: { sent: true },
	});
};

export const verifyResetTokenController = async (
	req: Request,
	res: Response,
) => {
	const rawToken = String(req.body.token ?? "").trim();
	const tokenHash = hashResetToken(rawToken);

	const record = await prisma.passwordResetToken.findUnique({
		where: { tokenHash },
		select: { id: true, expiresAt: true, usedAt: true },
	});

	if (!record || record.usedAt !== null || record.expiresAt <= new Date()) {
		throw new AppError(400, "Reset token is invalid or has expired");
	}

	return sendResponse(res, {
		statusCode: 200,
		message: "Reset token is valid",
		data: { valid: true, expiresAt: record.expiresAt },
	});
};

export const resetPasswordController = async (req: Request, res: Response) => {
	const rawToken = String(req.body.token ?? "").trim();
	const newPassword = String(req.body.password ?? "");
	const tokenHash = hashResetToken(rawToken);

	const record = await prisma.passwordResetToken.findUnique({
		where: { tokenHash },
		include: {
			user: { select: { id: true, status: true, schoolId: true } },
		},
	});

	if (!record || record.usedAt !== null || record.expiresAt <= new Date()) {
		throw new AppError(400, "Reset token is invalid or has expired");
	}

	if (record.user.status !== "ACTIVE") {
		throw new AppError(403, "Account is not active");
	}

	const passwordHash = await hashPassword(newPassword);
	const now = new Date();

	await prisma.$transaction([
		prisma.user.update({
			where: { id: record.userId },
			data: {
				passwordHash,
				mustChangePassword: false,
				passwordChangedAt: now,
			},
		}),
		prisma.passwordResetToken.updateMany({
			where: { userId: record.userId, usedAt: null },
			data: { usedAt: now },
		}),
	]);

	await recordPlatformAudit({
		actorId: record.userId,
		action: AuditAction.PASSWORD_CHANGE,
		entityType: "User",
		entityId: record.userId,
		schoolId: record.user.schoolId,
		description: "Password reset completed and prior sessions invalidated",
		ipAddress: req.ip ?? null,
		userAgent: req.headers["user-agent"] ?? null,
	});

	return sendResponse(res, {
		statusCode: 200,
		message: "Password has been reset successfully. Please sign in.",
		data: { reset: true },
	});
};
