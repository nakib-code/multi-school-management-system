import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { generateToken } from "../../utils/jwt.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import type { LoginInput, SignupInput } from "./interface.js";

export const signup = async (payload: SignupInput) => {
  const { name, email, password, phone } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(409, "User with this email already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      phone,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return user;
};


export const login = async (payload: LoginInput) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(403, "Your account is not active");
  }

  const isPasswordMatched = await comparePassword(
    password,
    user.passwordHash,
  );

  if (!isPasswordMatched) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
    token,
  };
};