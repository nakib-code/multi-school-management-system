import { Router } from "express";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { getActiveClasses } from "../class/service.js";
import {
	verifyLandingAdminLogin,
	verifyWebsiteConnection,
} from "../schoolSetting/service.js";
import { getActiveSections } from "../section/service.js";

const router = Router();

const websiteVerifyLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 300,
	keyPrefix: "public-website-verify",
	message: "Too many connection attempts. Please try again later.",
});

const landingAdminLoginLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 30,
	keyPrefix: "public-website-admin-login",
	message: "Too many login attempts. Please try again in 15 minutes.",
});

// ============================================
// External Website Handshake & Admin Login
// ============================================

router.post(
	"/website/verify-connection",
	websiteVerifyLimiter,
	async (req, res, next) => {
		try {
			const schoolId = Number(req.body?.schoolId);
			const connectionKey = String(req.body?.connectionKey ?? "");
			const result = await verifyWebsiteConnection(schoolId, connectionKey);

			return sendResponse(res, {
				statusCode: 200,
				message: "External website connected successfully",
				data: result,
			});
		} catch (error) {
			next(error);
		}
	},
);

router.post(
	"/website/admin-login",
	landingAdminLoginLimiter,
	async (req, res, next) => {
		try {
			const schoolId = Number(req.body?.schoolId);
			const connectionKey = String(req.body?.connectionKey ?? "");
			const email = String(req.body?.email ?? "");
			const password = String(req.body?.password ?? "");

			if (!email.trim() || !password) {
				throw new AppError(400, "Email and password are required");
			}

			const result = await verifyLandingAdminLogin({
				schoolId,
				connectionKey,
				email,
				password,
			});

			return sendResponse(res, {
				statusCode: 200,
				message: "Landing admin authenticated successfully",
				data: result,
			});
		} catch (error) {
			next(error);
		}
	},
);

// ============================================
// Public Active Classes (for Online Admissions)
// ============================================

router.get("/schools/:schoolId/classes/active", async (req, res, next) => {
	try {
		const schoolId = Number(req.params.schoolId);

		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			throw new AppError(400, "Invalid school ID");
		}

		const result = await getActiveClasses(schoolId);

		return sendResponse(res, {
			statusCode: 200,
			message: "Active classes retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
});

// ============================================
// Public Active Sections (for Online Admissions)
// ============================================

router.get("/schools/:schoolId/sections/active", async (req, res, next) => {
	try {
		const schoolId = Number(req.params.schoolId);

		if (!Number.isInteger(schoolId) || schoolId <= 0) {
			throw new AppError(400, "Invalid school ID");
		}

		const classId =
			req.query.classId !== undefined ? Number(req.query.classId) : undefined;

		if (classId !== undefined && (!Number.isInteger(classId) || classId <= 0)) {
			throw new AppError(400, "Invalid class ID");
		}

		const result = await getActiveSections(schoolId, classId);

		return sendResponse(res, {
			statusCode: 200,
			message: "Active sections retrieved successfully",
			data: result,
		});
	} catch (error) {
		next(error);
	}
});

export const publicRoutes = router;
