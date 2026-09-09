import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/appError.js";
import { generateToken } from "../../utils/jwt.js";
import { comparePassword } from "../../utils/password.js";
import type { LoginInput } from "./interface.js";


export const login = async (payload: LoginInput) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      school: true,
    },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(403, "Your account is not active");
  }

  if (
    user.role !== "SUPER_ADMIN" &&
    (!user.school || user.school.status !== "ACTIVE")
  ) {
    throw new AppError(
      403,
      "Your school is not active",
    );
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
    ...(user.schoolId !== null && {
      schoolId: user.schoolId,
    }),
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId,
      mustChangePassword: user.mustChangePassword,
    },
    token,
  };
};