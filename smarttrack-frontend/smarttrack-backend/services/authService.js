import supabase from '../supabaseClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOTPEmail } from '../utils/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

// ------------------ LOGIN ------------------
export const loginService = async (email, password) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) throw new Error('Invalid email or password');

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) throw new Error('Invalid email or password');

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
};

// ------------------ FORGOT PASSWORD ------------------
export const forgotPasswordService = async (email) => {
  // Check if user exists
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (!user) throw new Error('User not found');

  // Delete old OTPs
  await supabase.from('password_otps').delete().eq('email', email);

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Insert OTP
  const { error: otpError } = await supabase
    .from('password_otps')
    .insert([{ email, otp, expires_at }]);

  if (otpError) throw new Error(otpError.message);

  // Send OTP email
  await sendOTPEmail(email, otp);

  return { message: 'OTP sent successfully' };
};

// ------------------ VERIFY OTP ------------------
export const verifyOTPService = async (email, otp) => {
  const { data } = await supabase
    .from('password_otps')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!data) throw new Error('Invalid or expired OTP');

  return { message: 'OTP verified successfully' };
};

// ------------------ RESET PASSWORD ------------------
export const resetPasswordService = async (email, otp, newPassword) => {
  // Verify OTP first
  const { data } = await supabase
    .from('password_otps')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!data) throw new Error('Invalid or expired OTP');

  // Hash new password
  const password_hash = await bcrypt.hash(newPassword, 10);

  // Update user password
  const { error } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('email', email);

  if (error) throw new Error(error.message);

  // Delete used OTP
  await supabase.from('password_otps').delete().eq('email', email);

  return { message: 'Password reset successfully' };
};
