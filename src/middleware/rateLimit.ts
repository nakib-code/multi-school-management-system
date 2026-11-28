import type { NextFunction, Request, Response } from "express";
import redisClient from "../lib/redis.js";
import AppError from "../utils/appError.js";

const memoryStore = new Map<string, { count: number; resetAt: number }>();
const MAX_MEMORY_ENTRIES = 10_000;
let lastSweepAt = 0;

const sweepExpiredMemoryEntries = (now: number) => {
	if (now - lastSweepAt < 60_000 && memoryStore.size < MAX_MEMORY_ENTRIES) {
		return;
	}
	lastSweepAt = now;
	for (const [k, v] of memoryStore.entries()) {
		if (v.resetAt <= now) {
			memoryStore.delete(k);
		}
	}
	// If still over cap under heavy flood, evict oldest keys
	if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
		const excess = memoryStore.size - Math.floor(MAX_MEMORY_ENTRIES * 0.8);
		let removed = 0;
		for (const k of memoryStore.keys()) {
			memoryStore.delete(k);
			removed += 1;
			if (removed >= excess) break;
		}
	}
};

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
		sweepExpiredMemoryEntries(now);
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
