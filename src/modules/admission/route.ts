import { Router } from "express";
import { createAdmissionController } from "./controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createAdmissionSchema } from "./validation.js";

const router = Router();

router.post(
  "/",
  validateRequest(createAdmissionSchema),
  createAdmissionController,
);

export const admissionRoutes = router;