import jwt from "jsonwebtoken";
import env from "../config/env.js";

export interface JwtPayload {
  userId: number;
  role: "ADMIN" | "MANAGER" | "TEACHER" | "GUARDIAN";
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwt_secret, {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt_secret) as unknown as JwtPayload;
};