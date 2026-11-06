import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { PrismaClient } from "./generated/prisma/client.js";

/* ---------- Prisma setup ---------- */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

/* ---------- Constants ---------- */
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

/* ---------- Super Admin ---------- */
const seedSuperAdmin = async () => {
  const email = "superadmin@school.com";
  const password = "SuperAdmin@123";

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log("⚠️  Super Admin already exists — skipped");
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

  console.log("✅ Super Admin created:", superAdmin.email);
};

/* ---------- Package seeding ---------- */
type SeedPackageInput = {
  name: string;
  description: string;
  price: number;
  studentLimit: number;
};

const seedPackage = async ({
  name,
  description,
  price,
  studentLimit,
}: SeedPackageInput) => {
  const packageData = await prisma.package.upsert({
    where: { name },
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

  // Replace existing feature configs
  await prisma.packageFeatureConfig.deleteMany({
    where: { packageId: packageData.id },
  });

  await prisma.packageFeatureConfig.createMany({
    data: packageFeatures.map((feature) => ({
      packageId: packageData.id,
      feature,
      enabled: true,
    })),
  });

  console.log(`✅ ${name} package seeded (${studentLimit} students)`);
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

/* ---------- Landing page data ---------- */
async function seedLandingPageData() {
  // 1. Test school
  let school = await prisma.school.findUnique({
    where: { code: "greenvalley" },
  });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "Green Valley Islamic KG",
        code: "greenvalley",
        email: "info@greenvalley.com",
        phone: "01700000000",
        address: "Dhaka, Bangladesh",
        status: "ACTIVE",
        subdomain: "greenvalley",
        tagline: "Excellence in Islamic Education",
        description:
          "A leading Islamic kindergarten nurturing young minds with Islamic values and modern education.",
        primaryColor: "#0F766E",
        secondaryColor: "#F59E0B",
        contactEmail: "info@greenvalley.com",
        contactPhone: "01700000000",
        contactAddress: "123 Main Road, Dhaka",
      },
    });
    console.log("✅ School created:", school.code);
  } else {
    console.log("⚠️  School already exists:", school.code);
  }

  // 2. About page
  await prisma.schoolPageContent.upsert({
    where: { schoolId_slug: { schoolId: school.id, slug: "about" } },
    update: {},
    create: {
      schoolId: school.id,
      slug: "about",
      title: "About Our School",
      content:
        "<p>Green Valley Islamic KG provides quality Islamic education for young children. Our curriculum combines modern academics with Islamic values.</p><p>We believe in nurturing each child's potential in a caring, Islamic environment.</p>",
      isPublished: true,
    },
  });
  console.log("✅ About page seeded");

  // 3. Notices
  const noticeCount = await prisma.schoolNotice.count({
    where: { schoolId: school.id },
  });

  if (noticeCount === 0) {
    await prisma.schoolNotice.createMany({
      data: [
        {
          schoolId: school.id,
          title: "Admission Open 2026",
          content:
            "<p>Admission is now open for Play, Nursery, KG-1, and KG-2. Apply online today!</p>",
          category: "admission",
          isPublic: true,
          isPinned: true,
          publishedAt: new Date(),
        },
        {
          schoolId: school.id,
          title: "Annual Sports Day",
          content:
            "<p>Our annual sports day will be held on December 15, 2026. Parents are welcome.</p>",
          category: "event",
          isPublic: true,
          publishedAt: new Date(),
        },
      ],
    });
    console.log("✅ Notices seeded");
  } else {
    console.log("⚠️  Notices already exist — skipped");
  }

  // 4. Gallery
  const galleryCount = await prisma.schoolGalleryImage.count({
    where: { schoolId: school.id },
  });

  if (galleryCount === 0) {
    await prisma.schoolGalleryImage.createMany({
      data: [
        {
          schoolId: school.id,
          url: "https://picsum.photos/seed/gv1/600",
          caption: "Campus",
          isPublic: true,
          sortOrder: 1,
        },
        {
          schoolId: school.id,
          url: "https://picsum.photos/seed/gv2/600",
          caption: "Classroom",
          isPublic: true,
          sortOrder: 2,
        },
        {
          schoolId: school.id,
          url: "https://picsum.photos/seed/gv3/600",
          caption: "Playground",
          isPublic: true,
          sortOrder: 3,
        },
      ],
    });
    console.log("✅ Gallery seeded");
  } else {
    console.log("⚠️  Gallery already exists — skipped");
  }

  console.log("✅ Landing page data seeded");
}

/* ---------- Main seed ---------- */
const seed = async () => {
  console.log("🌱 Starting database seed...\n");

  await seedSuperAdmin();
  await seedPackages();
  await seedLandingPageData();

  console.log("\n✅ Database seed completed successfully");
};

/* ---------- Run ---------- */
seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Prisma disconnected");
  });