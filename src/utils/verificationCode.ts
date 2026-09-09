import redisClient from "../lib/redis.js";

const CODE_EXPIRY_SECONDS = 10 * 60; // 10 minutes

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const saveVerificationCode = async (
  email: string,
  code: string,
): Promise<void> => {
  const key = `school:admin:email-verification:${email}`;

  await redisClient.set(key, code, {
    EX: CODE_EXPIRY_SECONDS,
  });
};

export const getVerificationCode = async (
  email: string,
): Promise<string | null> => {
  const key = `school:admin:email-verification:${email}`;

  return redisClient.get(key);
};

export const deleteVerificationCode = async (
  email: string,
): Promise<void> => {
  const key = `school:admin:email-verification:${email}`;

  await redisClient.del(key);
};