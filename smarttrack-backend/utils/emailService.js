// utils/emailService.js  (API-only)
import dotenv from "dotenv";
dotenv.config();

const BREVO_API_KEY = (process.env.BREVO_API_KEY || "").trim();
const FROM_EMAIL = process.env.BREVO_FROM || "no-reply@yourdomain.com";

console.log("DEBUG BREVO_API_KEY present:", !!BREVO_API_KEY);
console.log("DEBUG BREVO_FROM:", FROM_EMAIL);

export const sendOTPEmail = async (email, otp) => {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: "SmartTrack" },
        to: [{ email }],
        subject: "SmartTrack OTP Verification",
        htmlContent: `<div style="font-family: Arial, sans-serif;"><h2>SmartTrack OTP</h2><p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p></div>`,
      }),
    });

    const data = await res.json().catch(()=>({}));
    if (!res.ok) {
      console.error("❌ Brevo API Error:", res.status, data);
      return false;
    }

    console.log("📩 OTP sent via Brevo API:", data);
    return true;
  } catch (error) {
    console.error("❌ Brevo API Send Error:", error && error.message);
    return false;
  }
};
