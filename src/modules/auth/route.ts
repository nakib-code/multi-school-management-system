import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { loginController } from "./controller.js";
import { loginSchema } from "./validation.js";

const router = Router();

router.post("/login", validateRequest(loginSchema), loginController);

export const authRoutes = router;
