import { Router } from "express";
import { createAdmissionController, verifyStudentEmailController } from "./controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createAdmissionSchema, verifyStudentEmailSchema } from "./validation.js";

const router = Router();

router.post(
  "/",
  validateRequest(createAdmissionSchema),
  createAdmissionController,
);
router.post(
  "/verify-email",
  validateRequest(verifyStudentEmailSchema),
  verifyStudentEmailController,
);

export const admissionRoutes = router;