import { Router } from "express";
import env from "../../config/env.js";
import { UserRole } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import AppError from "../../utils/appError.js";
import { getSchoolsController } from "../school/controller.js";
import {
	getMeController,
	loginController,
	logoutController,
} from "./controller.js";
import { googleClient } from "./google.js";
import { googleAdminLogin } from "./service.js";
import { loginSchema } from "./validation.js";

const router = Router();

const cookieOptions = {
	httpOnly: true,
	secure: false,
	sameSite: "lax" as const,
	maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post("/login", validateRequest(loginSchema), loginController);

router.get(
	"/",
	authenticate,
	authorize(UserRole.SUPER_ADMIN),
	getSchoolsController,
);

router.get("/me", authenticate, getMeController);

router.post("/logout", logoutController);

// Google Admin Login
router.get("/google", (_req, res) => {
	const authUrl = googleClient.generateAuthUrl({
		access_type: "offline",
		scope: ["openid", "email", "profile"],
	});

	res.redirect(authUrl);
});

router.get("/google/callback", async (req, res, next) => {
	try {
		const code = req.query.code;

		if (typeof code !== "string") {
			return next(new AppError(400, "Google authorization code is missing"));
		}

		const { tokens } = await googleClient.getToken(code);

		googleClient.setCredentials(tokens);

		if (!tokens.id_token) {
			return next(new AppError(400, "Google ID token not received"));
		}

		const ticket = await googleClient.verifyIdToken({
			idToken: tokens.id_token,
			audience: env.google_client_id,
		});

		const payload = ticket.getPayload();

		if (!payload?.email || payload.email_verified !== true) {
			return next(new AppError(400, "Google account email is not verified"));
		}

		const result = await googleAdminLogin(payload.email);

		res.cookie("accessToken", result.token, cookieOptions);

		return res.status(200).json({
			success: true,
			message: "Google login successful",
			data: result.user,
		});
	} catch (error) {
		next(error);
	}
});

export const authRoutes = router;
