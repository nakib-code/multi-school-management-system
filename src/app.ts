import express from "express";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./modules/auth/route.js";
import { admissionRoutes } from "./modules/admission/route.js";
import { schoolRoutes } from "./modules/school/route.js";

const app = express();

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "School Management System API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admissions", admissionRoutes);
app.use("/api/schools", schoolRoutes);


app.use(notFound);
app.use(errorHandler);

export default app;