import { OAuth2Client } from "google-auth-library";
import env from "../../config/env.js";

export const googleClient = new OAuth2Client(
	env.google_client_id,
	env.google_client_secret,
	env.google_callback_url,
);
