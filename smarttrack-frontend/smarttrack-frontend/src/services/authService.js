import api from "./api";

export const login = (payload) => api.post("/users/login", payload);
export const forgotPassword = (email) => api.post("/users/forgot-password", { email });
export const verifyOtp = (payload) => api.post("/users/verify-otp", payload);
export const resetPassword = (payload) => api.post("/users/reset-password", payload);

export default { login, forgotPassword, verifyOtp, resetPassword };
