import { createClient } from "redis";
import env from "../config/env.js";

const redisClient = createClient(
    env.redis_url
        ? { url: env.redis_url }                    // managed Redis-এর জন্য
        : {
              username: env.redis_user,             // self-hosted-এর জন্য
              password: env.redis_password,
              socket: {
                  host: env.redis_host,
                  port: Number(env.redis_port),
              },
          }
);

redisClient.on("error", (e) => console.error("Redis Client Error:", e));

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log("✅ Redis connected");
    }
};

export default redisClient;