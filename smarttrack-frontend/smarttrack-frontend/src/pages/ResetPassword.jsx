// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(120); // 2 minutes countdown
  const [resendLoading, setResendLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email; // email passed from ForgotPassword page

  useEffect(() => {
    if (otpCountdown <= 0) return;

    const timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    if (!/^\d{4,6}$/.test(otp)) {
      alert("OTP must be 4-6 digits");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("https://smarttrack-khz8.onrender.com/api/users/reset-password", {
        email,
        otp,
        newPassword: password,
      });

      setMessage(res.data.message || "Password reset successful!");
      setTimeout(() => navigate("/"), 2000); // Redirect to login
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.message || "Invalid OTP or error");
      } else {
        setMessage("No response from backend. Check server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const res = await axios.post("https://smarttrack-khz8.onrender.com/api/users/forgot-password", { email });
      setMessage(res.data.message || "OTP resent!");
      setOtpCountdown(120); // reset countdown
    } catch (error) {
      setMessage("Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) return <p>Email not found. Go back and try again.</p>;

  return (
    <div style={{ padding: "2rem", maxWidth: "400px", margin: "auto" }}>
      <h1>Reset Password</h1>
      <p>OTP sent to: <b>{email}</b></p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>OTP:</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
            maxLength={6}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>New Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem" }}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      <div style={{ marginTop: "1rem" }}>
        {otpCountdown > 0 ? (
          <p>Resend OTP in: {otpCountdown}s</p>
        ) : (
          <button onClick={handleResend} disabled={resendLoading} style={{ padding: "0.3rem 0.6rem" }}>
            {resendLoading ? "Resending..." : "Resend OTP"}
          </button>
        )}
      </div>

      {message && (
        <p style={{ marginTop: "1rem", color: message.includes("successful") ? "green" : "red" }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default ResetPassword;
