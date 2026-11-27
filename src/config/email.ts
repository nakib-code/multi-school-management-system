import nodemailer from "nodemailer";

import env from "./env.js";

const smtpHost = env.smtp_host?.trim() || "smtp.gmail.com";
const smtpPort = Number(env.smtp_port) || 587;
const smtpSecure =
	env.smtp_secure !== undefined
		? env.smtp_secure.toLowerCase() === "true"
		: smtpPort === 465;

const transporter = nodemailer.createTransport({
	host: smtpHost,
	port: smtpPort,
	secure: smtpSecure,
	auth: {
		user: env.smtp_user,
		pass: env.smtp_password,
	},
});

export default transporter;
