// utils/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Use EMAIL_USER and EMAIL_PASS consistently
const USER = process.env.EMAIL_USER;        // your Gmail address
const PASS = process.env.EMAIL_PASS;        // your Gmail App Password (16 chars)

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS will be used with STARTTLS
  auth: { user: USER, pass: PASS },
  connectionTimeout: 30_000,   // 30s
  greetingTimeout: 30_000,
  socketTimeout: 30_000,
  tls: { rejectUnauthorized: false }, // helps in some hosted environments
  logger: true,
  debug: true,
});

export const sendOTPEmail = async (email, otp) => {
  try {
    console.log("Sending Gmail OTP to:", email, "from:", USER);

    const info = await transporter.sendMail({
      from: `"SmartTrack" <${USER}>`,
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
    console.error("❌ Gmail send error:", error && error.message);
    console.error(error);
    return false;
  }
};
