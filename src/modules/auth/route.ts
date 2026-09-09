import { Router } from "express";
import { loginController } from "./controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { loginSchema, signupSchema } from "./validation.js";

const router = Router();

router.post(
  "/login",
  validateRequest(loginSchema),
  loginController,
);


export const authRoutes = router;