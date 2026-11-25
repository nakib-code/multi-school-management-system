import { createClient } from "redis";
import env from "../config/env.js";

const hasRedisConfig = Boolean(env.redis_url || env.redis_host);

const redisClient = hasRedisConfig
	? createClient(
			env.redis_url
				? { url: env.redis_url } // managed Redis-এর জন্য
				: {
						username: env.redis_user, // self-hosted-এর জন্য
						password: env.redis_password,
						socket: {
							host: env.redis_host,
							port: Number(env.redis_port || 6379),
						},
					},
		)
	: createClient({
			socket: {
				reconnectStrategy: false,
			},
		});

redisClient.on("error", (e) => console.error("Redis Client Error:", e));

let connectingPromise: Promise<boolean> | null = null;

export const ensureRedis = async (): Promise<boolean> => {
	if (!hasRedisConfig) {
		return false;
	}

	if (redisClient.isOpen) {
		return true;
	}

	if (!connectingPromise) {
		connectingPromise = redisClient
			.connect()
			.then(() => true)
			.catch((error) => {
				console.error("Redis connection failed:", error);
				return false;
			})
			.finally(() => {
				connectingPromise = null;
			});
	}

	return connectingPromise;
};

export const connectRedis = async () => {
	const connected = await ensureRedis();
	if (connected) {
		console.log("✅ Redis connected");
	}
};

export default redisClient;
