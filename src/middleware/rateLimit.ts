import type { NextFunction, Request, Response } from "express";
import redisClient from "../lib/redis.js";
import AppError from "../utils/appError.js";

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export const createRateLimiter = (options: {
	windowMs: number;
	max: number;
	keyPrefix: string;
	message?: string;
}) => {
	const { windowMs, max, keyPrefix, message } = options;

	return async (req: Request, _res: Response, next: NextFunction) => {
		const ip = req.ip || req.socket.remoteAddress || "unknown";
		const key = `ratelimit:${keyPrefix}:${ip}`;
		const ttlSec = Math.ceil(windowMs / 1000);

		try {
			if (redisClient.isOpen) {
				const count = await redisClient.incr(key);
				if (count === 1) {
					await redisClient.expire(key, ttlSec);
				}
				if (count > max) {
					return next(
						new AppError(
							429,
							message ?? "Too many requests. Please try again later.",
						),
					);
				}
				return next();
			}
		} catch {
			// Fall back to in-memory limiter if Redis is unavailable
		}

		const now = Date.now();
		const entry = memoryStore.get(key);
		if (!entry || entry.resetAt <= now) {
			memoryStore.set(key, { count: 1, resetAt: now + windowMs });
			return next();
		}

		entry.count += 1;
		if (entry.count > max) {
			return next(
				new AppError(
					429,
					message ?? "Too many requests. Please try again later.",
				),
			);
		}
		return next();
	};
};
