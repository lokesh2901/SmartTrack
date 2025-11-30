import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (email, otp) => {
  try {
    console.log("Sending email to:", email);

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

    console.log("FULL RESEND RESPONSE:", JSON.stringify(response, null, 2));

    return response; // DO NOT return true blindly

  } catch (error) {
    console.error("RESEND ERROR MESSAGE:", error.message);
    console.error("RESEND FULL ERROR:", JSON.stringify(error, null, 2));

    if (error.response) {
      console.error("PROVIDER ERROR RESPONSE:", JSON.stringify(error.response, null, 2));
    }

    throw new Error("Failed to send OTP email");
  }
};
