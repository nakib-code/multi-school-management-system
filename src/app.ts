import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";

import env from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import { getExternalWebsiteOrigins } from "./lib/corsOrigins.js";

import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

import { admissionRoutes } from "./modules/admission/route.js";
import { attendanceRoutes } from "./modules/attendance/route.js";
import { auditLogRoutes } from "./modules/audit-log/route.js";
import { authRoutes } from "./modules/auth/route.js";
import { classRoutes } from "./modules/class/route.js";
import { classDiaryRoutes } from "./modules/class-diary/route.js";
import { classRoutineRoutes } from "./modules/class-routine/route.js";
import { customExpenseRoutes } from "./modules/custom-expense/route.js";
import { dashboardRoutes } from "./modules/dashboard/route.js";
import { enrollmentRoutes } from "./modules/enrollment/route.js";
import { examRoutes } from "./modules/exam/route.js";
import { guardianRoutes } from "./modules/guardian/route.js";
import { hefzRoutes } from "./modules/hefz/route.js";
import { incomeRoutes } from "./modules/income/route.js";
import { managerRoutes } from "./modules/manager/route.js";
import { notificationRoutes } from "./modules/notification/route.js";
import { packageRouter } from "./modules/package/package.route.js";
import { paymentRoutes } from "./modules/payment/route.js";
import { platformAuditLogRoutes } from "./modules/platform-audit-log/route.js";
import { platformSettingRoutes } from "./modules/platformSetting/route.js";
import { publicRoutes } from "./modules/public/route.js";
import { reportRoutes, schoolReportRoutes } from "./modules/report/route.js";
import { resultRoutes } from "./modules/result/route.js";
import { salaryPaymentRoutes } from "./modules/salary-payment/route.js";
import { schoolRoutes } from "./modules/school/route.js";
import { schoolSettingRoutes } from "./modules/schoolSetting/route.js";
import { sectionRoutes } from "./modules/section/route.js";
import { studentRoutes } from "./modules/student/route.js";
import { studentFeeRoutes } from "./modules/student-fee/route.js";
import { studentPaymentRoutes } from "./modules/student-payment/route.js";
import { subjectRoutes } from "./modules/subject/route.js";
import { subscriptionRouter } from "./modules/subscription/subscription.route.js";
import { subscriptionPaymentRoutes } from "./modules/subscriptionPayment/route.js";
import { teacherRoutes } from "./modules/teacher/route.js";
import { teacherAssignmentRoutes } from "./modules/teacher-assignment/route.js";
import { teacherSalaryRoutes } from "./modules/teacher-salary/route.js";
import { uploadRoutes } from "./modules/upload/route.js";
import { userRoutes } from "./modules/user/route.js";

const app = express();
app.set("trust proxy", 1);

// Global middleware
const allowedOrigins = (env.frontend_url ?? "")
	.split(",")
	.map((o) => o.trim().replace(/\/$/, ""))
	.filter(Boolean);

const isProduction = env.node_env === "production";

const isTrustedAppOrigin = (normalized: string): boolean =>
	allowedOrigins.some((o) => o.toLowerCase() === normalized) ||
	(!isProduction &&
		(normalized === "http://localhost:3000" ||
			normalized === "http://localhost:3001"));

// Global credentialed CORS strictly limited to explicit FRONTEND_URL allowlist
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) return callback(null, true);
			const normalized = origin.replace(/\/$/, "").toLowerCase();
			if (isTrustedAppOrigin(normalized)) {
				return callback(null, true);
			}
			return callback(null, false);
		},
		credentials: true,
	}),
);

// Non-credentialed CORS for public endpoints consumed by connected external school websites
const publicExternalCors = cors({
	origin: (origin, callback) => {
		if (!origin) return callback(null, true);
		const normalized = origin.replace(/\/$/, "").toLowerCase();
		if (isTrustedAppOrigin(normalized)) {
			return callback(null, true);
		}
		getExternalWebsiteOrigins()
			.then((externalOrigins) =>
				callback(null, externalOrigins.has(normalized)),
			)
			.catch(() => callback(null, false));
	},
	credentials: false,
});

app.use(express.json({ limit: "4.5mb" }));
app.use(express.urlencoded({ extended: true, limit: "4.5mb" }));
app.use(cookieParser());

// Root
app.get("/", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "Multi-School Management System API is running",
	});
});

if (!isProduction) {
	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Health check
app.get("/api/v1/health", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "Multi-School Management System API is running",
	});
});

// API v1 routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", admissionRoutes);
app.use("/api/v1/schools", schoolRoutes);
app.use("/api/v1", studentRoutes);
app.use("/api/v1", teacherRoutes);
app.use("/api/v1", schoolSettingRoutes);
app.use("/api/v1", paymentRoutes);
app.use("/api/v1", subscriptionPaymentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/packages", packageRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1", schoolReportRoutes);
app.use("/api/v1", classRoutes);
app.use("/api/v1", sectionRoutes);
app.use("/api/v1", subjectRoutes);
app.use("/api/v1", teacherAssignmentRoutes);
app.use("/api/v1", enrollmentRoutes);
app.use("/api/v1", attendanceRoutes);
app.use("/api/v1", examRoutes);
app.use("/api/v1", resultRoutes);
app.use("/api/v1", guardianRoutes);
app.use("/api/v1", managerRoutes);
app.use("/api/v1", studentFeeRoutes);
app.use("/api/v1", studentPaymentRoutes);
app.use("/api/v1", customExpenseRoutes);
app.use("/api/v1", incomeRoutes);
app.use("/api/v1", teacherSalaryRoutes);
app.use("/api/v1", salaryPaymentRoutes);
app.use("/api/v1", auditLogRoutes);
app.use("/api/v1", hefzRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1", classRoutineRoutes);
app.use("/api/v1", classDiaryRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/platform-audit-logs", platformAuditLogRoutes);
app.use("/api/v1/platform-settings", platformSettingRoutes);
app.use("/api/v1/public", publicExternalCors, publicRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
