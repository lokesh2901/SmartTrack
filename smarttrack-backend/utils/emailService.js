// utils/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,         // smtp-relay.brevo.com
  port: parseInt(process.env.BREVO_PORT || "587", 10),
  secure: false,                        // STARTTLS
  auth: {
    user: process.env.BREVO_USER,       // your Brevo login email
    pass: process.env.BREVO_PASS,       // SMTP key
  },
});

export const sendOTPEmail = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `SmartTrack <${process.env.BREVO_FROM}>`,
      to: email,
      subject: "SmartTrack OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>SmartTrack OTP</h2>
          <p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>
        </div>
      `,
    });

    console.log("📩 OTP sent via Brevo:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Brevo SMTP Error:", error.message);
    return false;
  }
};
