import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
	path: path.join(process.cwd(), ".env"),
});

export default {
	database_url: process.env.DATABASE_URL as string,
	redis_url: process.env.REDIS_URL as string,
	port: process.env.PORT,
	jwt_secret: process.env.JWT_SECRET as string,
	node_env: process.env.NODE_ENV as string,
	redis_user: process.env.REDIS_USER as string,
	redis_password: process.env.REDIS_PASSWORD as string,
	redis_host: process.env.REDIS_HOST as string,
	redis_port: process.env.REDIS_PORT as string,
	smtp_user: process.env.SMTP_USER as string,
	email_sender: process.env.EMAIL_SENDER as string,
	smtp_password: process.env.SMTP_PASSWORD as string,
	platform_bkash_number: process.env.PLATFORM_BKASH_NUMBER,
	platform_nagad_number: process.env.PLATFORM_NAGAD_NUMBER,
	platform_rocket_number: process.env.PLATFORM_ROCKET_NUMBER,
	backend_url: process.env.BACKEND_URL,
	frontend_url: process.env.FRONTEND_URL,
	google_client_id: process.env.GOOGLE_CLIENT_ID as string,
	google_client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
	google_callback_url: process.env.GOOGLE_CALLBACK_URL as string,
	cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
	cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
};
