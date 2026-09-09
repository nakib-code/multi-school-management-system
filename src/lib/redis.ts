import { createClient } from "redis";
import env from "../config/env.js";


const redisClient = createClient({
  username: env.redis_user,
  password: env.redis_password,
  socket: {
    host: env.redis_host,
    port: Number(env.redis_port),
  },
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Redis connected");
  }
};

export default redisClient;