import crypto from "node:crypto";
import redisClient, { ensureRedis } from "../lib/redis.js";
import AppError from "./appError.js";

const CODE_EXPIRY_SECONDS = 10 * 60; // 10 minutes
const DEFAULT_COOLDOWN_SECONDS = 60;

export const generateVerificationCode = (): string => {
	return crypto.randomInt(100000, 1000000).toString();
};

const requireRedis = async (): Promise<void> => {
	const connected = await ensureRedis();
	if (!connected || !redisClient.isOpen) {
		throw new AppError(
			503,
			"Verification service is temporarily unavailable. Please try again later.",
		);
	}
};

export const saveVerificationCode = async (
	email: string,
	code: string,
): Promise<void> => {
	await requireRedis();
	const key = `school:admin:email-verification:${email}`;

	await redisClient.set(key, code, {
		EX: CODE_EXPIRY_SECONDS,
	});
};

export const getVerificationCode = async (
	email: string,
): Promise<string | null> => {
	await requireRedis();
	const key = `school:admin:email-verification:${email}`;

	return redisClient.get(key);
};

export const deleteVerificationCode = async (email: string): Promise<void> => {
	await requireRedis();
	const key = `school:admin:email-verification:${email}`;

	await redisClient.del(key);
};

/* ---------- Teacher-Scoped OTP & Resend Cooldown ---------- */

const teacherOtpKey = (schoolId: number, email: string) =>
	`school:${schoolId}:teacher:email-verification:${email.trim().toLowerCase()}`;

const teacherCooldownKey = (schoolId: number, email: string) =>
	`school:${schoolId}:teacher:otp-cooldown:${email.trim().toLowerCase()}`;

export const saveTeacherVerificationCode = async (
	schoolId: number,
	email: string,
	code: string,
): Promise<void> => {
	await requireRedis();
	await redisClient.set(teacherOtpKey(schoolId, email), code, {
		EX: CODE_EXPIRY_SECONDS,
	});
};

export const getTeacherVerificationCode = async (
	schoolId: number,
	email: string,
): Promise<string | null> => {
	await requireRedis();
	return redisClient.get(teacherOtpKey(schoolId, email));
};

export const deleteTeacherVerificationCode = async (
	schoolId: number,
	email: string,
): Promise<void> => {
	await requireRedis();
	await redisClient.del(teacherOtpKey(schoolId, email));
};

export const getTeacherOtpCooldownRemaining = async (
	schoolId: number,
	email: string,
): Promise<number> => {
	await requireRedis();
	const ttl = await redisClient.ttl(teacherCooldownKey(schoolId, email));
	return ttl > 0 ? ttl : 0;
};

export const setTeacherOtpCooldown = async (
	schoolId: number,
	email: string,
	cooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
): Promise<void> => {
	await requireRedis();
	await redisClient.set(teacherCooldownKey(schoolId, email), "1", {
		EX: cooldownSeconds,
	});
};
