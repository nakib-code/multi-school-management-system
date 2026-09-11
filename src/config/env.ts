import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
	path: path.join(process.cwd(), ".env"),
});

export default {
	database_url: process.env.DATABASE_URL as string,
	port: process.env.PORT,
	jwt_secret: process.env.JWT_SECRET!,
	node_env: process.env.NODE_ENV!,
	redis_user: process.env.REDIS_USER as string,
	redis_password: process.env.REDIS_PASSWORD as string,
	redis_host: process.env.REDIS_HOST as string,
	redis_port: process.env.REDIS_PORT as string,
	smtp_user: process.env.SMTP_USER as string,
	email_sender: process.env.EMAIL_SENDER as string,
	smtp_password: process.env.SMTP_PASSWORD as string,
	sslcz_store_id: process.env.SSLCZ_STORE_ID as string,
	sslcz_store_password: process.env.SSLCZ_STORE_PASSWORD as string,
	sslcz_is_live: process.env.SSLCZ_IS_LIVE === "true",
	backend_url: process.env.BACKEND_URL,
	google_client_id: process.env.GOOGLE_CLIENT_ID as string,
	google_client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
	google_callback_url: process.env.GOOGLE_CALLBACK_URL as string,
};
