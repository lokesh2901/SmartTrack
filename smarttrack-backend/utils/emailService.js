import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email, otp) => {
  try {
    const response = await resend.emails.send({
      from: "SmartTrack <menakaattendancemanagement@gmail.com>",
      to: email,
      subject: "SmartTrack OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>SmartTrack OTP</h2>
          <p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>
        </div>
      `,
    });

    console.log("✅ OTP email sent via Resend:", response.id);
    return true;
  } catch (error) {
    console.error("❌ Resend error:", error);
    throw new Error("Failed to send OTP email");
  }
};
