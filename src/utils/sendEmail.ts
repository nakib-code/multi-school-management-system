import transporter from "../config/email.js";
import env from "../config/env.js";

export const sendVerificationEmail = async (
	email: string,
	code: string,
): Promise<void> => {
	await transporter.sendMail({
		from: env.email_sender,
		to: email,
		subject: "School Admin Email Verification",
		text: `Your school admin email verification code is: ${code}. This code will expire in 10 minutes.`,
		html: `
      <div>
        <h2>School Admin Email Verification</h2>
        <p>Your verification code is:</p>
        <h1>${code}</h1>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
      </div>
    `,
	});
};

export const sendPasswordResetEmail = async (
	email: string,
	resetUrl: string,
): Promise<void> => {
	await transporter.sendMail({
		from: env.email_sender,
		to: email,
		subject: "MadrasaOS — Password Reset Request",
		text: `You requested a password reset. Open this link within 30 minutes to set a new password: ${resetUrl}. If you did not request this, ignore this email.`,
		html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2>Password Reset Request</h2>
        <p>Click the button below within <strong>30 minutes</strong> to reset your password:</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="background:#061842;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p style="font-size:12px;color:#666;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
	});
};
