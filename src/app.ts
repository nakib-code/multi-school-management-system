import express from "express";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

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

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;