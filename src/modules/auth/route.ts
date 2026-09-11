import { Router } from "express";

import env from "../../config/env.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import AppError from "../../utils/appError.js";

import { loginController } from "./controller.js";
import { googleClient } from "./google.js";
import { googleAdminLogin } from "./service.js";
import { loginSchema } from "./validation.js";

const router = Router();

router.post("/login", validateRequest(loginSchema), loginController);

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

		// Make sure Google account email exists and is verified
		if (!payload?.email || payload.email_verified !== true) {
			return next(new AppError(400, "Google account email is not verified"));
		}

		// Only existing ADMIN accounts can login with Google
		const result = await googleAdminLogin(payload.email);

		return res.status(200).json({
			success: true,
			message: "Google login successful",
			data: result,
		});
	} catch (error) {
		next(error);
	}
});

export const authRoutes = router;
