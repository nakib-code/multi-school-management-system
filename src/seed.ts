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
	await prisma.package.upsert({
		where: { name },
		update: {
			description,
			price,
			billingCycle: "MONTHLY",
			studentLimit,
			isActive: true,
		},
		create: {
			name,
			description,
			price,
			billingCycle: "MONTHLY",
			studentLimit,
			isActive: true,
		},
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

	// Ensure a default School Admin exists for the seeded school
	const schoolAdminEmail = "admin@greenvalley.com";
	const schoolAdminPassword = "SchoolAdmin@123";
	const existingSchoolAdmin = await prisma.user.findUnique({
		where: { email: schoolAdminEmail },
	});

	if (!existingSchoolAdmin) {
		const passwordHash = await bcrypt.hash(schoolAdminPassword, 12);
		await prisma.user.create({
			data: {
				name: "Green Valley Admin",
				email: schoolAdminEmail,
				phone: "01700000001",
				passwordHash,
				role: "ADMIN",
				status: "ACTIVE",
				schoolId: school.id,
				mustChangePassword: false,
			},
		});
		console.log("✅ School Admin created:", schoolAdminEmail);
	} else {
		console.log("⚠️  School Admin already exists — skipped");
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
