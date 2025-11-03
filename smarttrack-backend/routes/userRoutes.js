import express from 'express';
import {
  addUser,
  updateUser,
  getUsers,
  loginUser,
  deleteUser
} from '../controllers/userController.js';
import { forgotPassword, verifyOTP, resetPassword } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// User management
router.post('/', verifyToken(['admin']), addUser);
router.put('/:id', verifyToken(['admin']), updateUser);
router.get('/', verifyToken(['admin', 'hr']), getUsers);
router.delete('/:id', verifyToken(['admin']), deleteUser); // ✅ NEW: Only admin can delete

// Auth endpoints
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

export default router;
