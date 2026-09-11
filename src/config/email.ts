import nodemailer from "nodemailer";

import env from "./env.js";

const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 587,
	secure: false,

	auth: {
		user: env.smtp_user,
		pass: env.smtp_password,
	},
});

export default transporter;
