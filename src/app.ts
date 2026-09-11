import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { admissionRoutes } from "./modules/admission/route.js";
import { authRoutes } from "./modules/auth/route.js";
import { paymentRoutes } from "./modules/payment/route.js";
import { schoolRoutes } from "./modules/school/route.js";
import { schoolSettingRoutes } from "./modules/schoolSetting/route.js";
import { studentRoutes } from "./modules/student/route.js";
import { teacherRoutes } from "./modules/teacher/route.js";

const app = express();

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "University Management System API is running",
	});
});

// Health check
app.get("/api/health", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "School Management System API is running",
	});
});

app.use("/api/auth", authRoutes);
app.use("/api", admissionRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api", studentRoutes);
app.use("/api", teacherRoutes);
app.use("/api", schoolSettingRoutes);
app.use("/api", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
