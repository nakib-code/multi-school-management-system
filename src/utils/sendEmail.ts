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
