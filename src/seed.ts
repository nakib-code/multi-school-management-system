import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import bcrypt from "bcrypt";

import { PrismaClient } from "./generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const packageFeatures = [
  "SCHOOL_MANAGEMENT",
  "USER_MANAGEMENT",
  "STUDENT_MANAGEMENT",
  "TEACHER_MANAGEMENT",
  "GUARDIAN_MANAGEMENT",
  "ADMISSION",
  "ATTENDANCE",
  "CLASS_MANAGEMENT",
  "SUBJECT_MANAGEMENT",
  "EXAM_MANAGEMENT",
  "RESULT_MANAGEMENT",
  "FEES_MANAGEMENT",
  "PAYMENT_MANAGEMENT",
  "TEACHER_SALARY",
  "REPORTS",
  "NOTIFICATIONS",
] as const;

const seedSuperAdmin = async () => {
  const email = "superadmin@school.com";
  const password = "SuperAdmin@123";

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    console.log("⚠️ Super Admin already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      mustChangePassword: true,
    },
  });

  console.log("✅ Super Admin created successfully");
  console.log("Email:", superAdmin.email);
};

const seedPackage = async ({
  name,
  description,
  price,
  studentLimit,
}: {
  name: string;
  description: string;
  price: number;
  studentLimit: number;
}) => {
  const packageData = await prisma.package.upsert({
    where: {
      name,
    },

    update: {
      description,
      price,
      billingCycle: "MONTHLY",
      studentLimit,
      isCustom: false,
      isActive: true,
    },

    create: {
      name,
      description,
      price,
      billingCycle: "MONTHLY",
      studentLimit,
      isCustom: false,
      isActive: true,
    },
  });

  await prisma.packageFeatureConfig.deleteMany({
    where: {
      packageId: packageData.id,
    },
  });

  await prisma.packageFeatureConfig.createMany({
    data: packageFeatures.map((feature) => ({
      packageId: packageData.id,
      feature,
      enabled: true,
    })),
  });

  console.log(
    `✅ ${name} package seeded (${studentLimit} students)`,
  );
};

const seedPackages = async () => {
  await seedPackage({
    name: "Standard",
    description: "Standard package for small schools",
    price: 3000,
    studentLimit: 300,
  });

  await seedPackage({
    name: "Standard Plus",
    description: "Extended package for growing schools",
    price: 5000,
    studentLimit: 500,
  });

  await seedPackage({
    name: "Pro",
    description: "Advanced package for large schools",
    price: 9000,
    studentLimit: 1000,
  });
};

const seed = async () => {
  console.log("🌱 Starting database seed...\n");

  await seedSuperAdmin();

  await seedPackages();

  console.log("\n✅ Database seed completed successfully");
};

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });