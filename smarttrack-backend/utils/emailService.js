import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,       // your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // your Gmail App Password
  },
});

export const sendOTPEmail = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"SmartTrack" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "SmartTrack OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>SmartTrack OTP</h2>
          <p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>
        </div>
      `,
    });

    console.log("📩 OTP Sent! Gmail Message ID:", info.messageId);
    return true;

  } catch (error) {
    console.error("❌ Gmail send error:", error.message);
    console.error(error);
    return false;
  }
};
