import crypto from "node:crypto";
import { Router } from "express";
import env from "../../config/env.js";
import { authenticate } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import AppError from "../../utils/appError.js";
import {
	changePasswordController,
	getMeController,
	loginController,
	logoutController,
	updateMeController,
} from "./controller.js";
import { createGoogleOAuthClient } from "./google.js";
import {
	forgotPasswordController,
	resetPasswordController,
	verifyResetTokenController,
} from "./passwordReset.js";
import { googleAdminLogin } from "./service.js";
import {
	changePasswordSchema,
	forgotPasswordSchema,
	loginSchema,
	resetPasswordSchema,
	updateMeSchema,
	verifyResetTokenSchema,
} from "./validation.js";

const router = Router();

const isProduction = env.node_env === "production";

const cookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: isProduction ? ("none" as const) : ("lax" as const),
	maxAge: 7 * 24 * 60 * 60 * 1000,
};

const loginLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 15,
	keyPrefix: "login",
	message: "Too many login attempts. Please try again in 15 minutes.",
});

const passwordResetLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 10,
	keyPrefix: "password-reset",
	message:
		"Too many password recovery attempts. Please try again in 15 minutes.",
});

router.post(
	"/login",
	loginLimiter,
	validateRequest(loginSchema),
	loginController,
);
router.post(
	"/forgot-password",
	passwordResetLimiter,
	validateRequest(forgotPasswordSchema),
	forgotPasswordController,
);
router.post(
	"/verify-reset-token",
	passwordResetLimiter,
	validateRequest(verifyResetTokenSchema),
	verifyResetTokenController,
);
router.post(
	"/reset-password",
	passwordResetLimiter,
	validateRequest(resetPasswordSchema),
	resetPasswordController,
);

router.post(
	"/change-password",
	authenticate,
	passwordResetLimiter,
	validateRequest(changePasswordSchema),
	changePasswordController,
);

router.get("/me", authenticate, getMeController);
router.patch(
	"/me",
	authenticate,
	validateRequest(updateMeSchema),
	updateMeController,
);

router.post("/logout", logoutController);

const getPrimaryFrontendUrl = () => {
	const raw = env.frontend_url ?? "http://localhost:3000";
	const primary =
		raw
			.split(",")
			.map((u) => u.trim())
			.find(Boolean) || "http://localhost:3000";
	return primary.replace(/\/+$/, "");
};

const OAUTH_STATE_COOKIE = "google_oauth_state";

// Google Admin Login
router.get("/google", (_req, res) => {
	const state = crypto.randomBytes(24).toString("hex");
	res.cookie(OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		secure: isProduction,
		sameSite: "lax",
		maxAge: 10 * 60 * 1000,
	});

	const client = createGoogleOAuthClient();
	const authUrl = client.generateAuthUrl({
		access_type: "offline",
		scope: ["openid", "email", "profile"],
		state,
	});

	res.redirect(authUrl);
});

router.get("/google/callback", async (req, res) => {
	const frontendBase = getPrimaryFrontendUrl();
	try {
		const code = req.query.code;
		const state = req.query.state;
		const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];

		res.clearCookie(OAUTH_STATE_COOKIE, {
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax",
		});

		if (
			typeof state !== "string" ||
			typeof expectedState !== "string" ||
			!state ||
			state !== expectedState
		) {
			throw new AppError(400, "Invalid OAuth state parameter");
		}

		if (typeof code !== "string") {
			throw new AppError(400, "Google authorization code is missing");
		}

		const client = createGoogleOAuthClient();
		const { tokens } = await client.getToken(code);

		if (!tokens.id_token) {
			throw new AppError(400, "Google ID token not received");
		}

		const ticket = await client.verifyIdToken({
			idToken: tokens.id_token,
			audience: env.google_client_id,
		});

		const payload = ticket.getPayload();

		if (!payload?.email || payload.email_verified !== true) {
			throw new AppError(400, "Google account email is not verified");
		}

		const result = await googleAdminLogin(payload.email);

		res.cookie("accessToken", result.token, cookieOptions);
		return res.redirect(`${frontendBase}/dashboard`);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Google authentication failed";
		return res.redirect(
			`${frontendBase}/auth/login?error=${encodeURIComponent(message)}`,
		);
	}
});

export const authRoutes = router;
