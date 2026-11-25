import crypto from "node:crypto";
import redisClient, { ensureRedis } from "../lib/redis.js";
import AppError from "./appError.js";

const CODE_EXPIRY_SECONDS = 10 * 60; // 10 minutes

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
