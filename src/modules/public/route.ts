import { Router } from "express";
import { requireSchoolFeature } from "../../middleware/schoolFeature.js";
import AppError from "../../utils/appError.js";
import sendResponse from "../../utils/sendResponse.js";
import { getActiveClasses } from "../class/service.js";
import { getActiveSections } from "../section/service.js";

import * as PublicController from "./controller.js";

const router = Router();

// ============================================
// ⚠️ IMPORTANT: resolve route must come BEFORE /schools/:schoolId
// ============================================

router.get("/schools/resolve", PublicController.resolveSchool);

// ============================================
// Public Active Classes
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
// Public Active Sections
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

// ============================================
// School-scoped public data
// ============================================

router.get(
	"/schools/:schoolId/page/:slug",
	requireSchoolFeature("hasPublicWebsite"),
	PublicController.getPageContent,
);
router.get(
	"/schools/:schoolId/notices",
	requireSchoolFeature("hasPublicWebsite"),
	PublicController.getNotices,
);
router.get(
	"/schools/:schoolId/notices/:id",
	requireSchoolFeature("hasPublicWebsite"),
	PublicController.getNoticeById,
);
router.get(
	"/schools/:schoolId/gallery",
	requireSchoolFeature("hasPublicWebsite"),
	PublicController.getGallery,
);
router.get(
	"/schools/:schoolId/stats",
	requireSchoolFeature("hasPublicWebsite"),
	PublicController.getStats,
);

router.post(
	"/schools/:schoolId/contact",
	requireSchoolFeature("hasPublicWebsite"),
	PublicController.submitContact,
);

export const publicRoutes = router;
