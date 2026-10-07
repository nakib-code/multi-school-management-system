import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import env from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { admissionRoutes } from "./modules/admission/route.js";
import { authRoutes } from "./modules/auth/route.js";
import { customPackageRequestRouter } from "./modules/customPackageRequest/customPackageRequest.route.js";
import { dashboardRoutes } from "./modules/dashboard/route.js";
import { packageRouter } from "./modules/package/package.route.js";
import { paymentRoutes } from "./modules/payment/route.js";
import { schoolRoutes } from "./modules/school/route.js";
import { schoolSettingRoutes } from "./modules/schoolSetting/route.js";
import { studentRoutes } from "./modules/student/route.js";
import { subscriptionRouter } from "./modules/subscription/subscription.route.js";
import { subscriptionPaymentRoutes } from "./modules/subscriptionPayment/route.js";
import { teacherRoutes } from "./modules/teacher/route.js";
import { userRoutes } from "./modules/user/route.js";
import { reportRoutes } from "./modules/report/route.js";
import { classRoutes } from "./modules/class/route.js";
import { sectionRoutes } from "./modules/section/route.js";
import { publicRoutes } from "./modules/public/route.js";

const app = express();

// Global middleware

app.use(
	cors({
		origin: env.frontend_url,
		credentials: true,
	}),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root

app.get("/", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "Multi-School Management System API API is running",
	});
});

// Health check

app.get("/api/v1/health", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "Multi-School Management System API API is running",
	});
});

// API v1

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
app.use("/api/v1/custom-package-requests", customPackageRequestRouter);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1", classRoutes);
app.use("/api/v1", sectionRoutes);
app.use("/api/v1/public", publicRoutes);

// 404

app.use(notFound);

// Global error handler

app.use(errorHandler);

export default app;
