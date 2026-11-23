import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
	deleteUploadController,
	listUploadsController,
	uploadFileController,
} from "./controller.js";
import { uploadFileSchema, uploadIdParamsSchema } from "./validation.js";

const router = Router();

router.post(
	"/",
	authenticate,
	validateRequest(uploadFileSchema),
	uploadFileController,
);

router.get("/", authenticate, listUploadsController);

router.delete(
	"/:id",
	authenticate,
	validateRequest(uploadIdParamsSchema),
	deleteUploadController,
);

export const uploadRoutes = router;
