import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  readtoken,
  resendVerificationEmail,
  requestEmailVerification,
  getMe,
  uploadAvatar,
} from '../controllers/userController.js';
import { authenticate_user } from '../middlewares/authMiddleware.js';
import uploadMiddleware from '../middlewares/upload.js'; // Import the new middleware

const router = express.Router();

// --- Authentication Routes ---
router.post('/register', register);
router.get('/verify-email/:token', verifyEmail);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate_user, getMe);
router.put('/profile', authenticate_user, updateProfile);

// --- Password Reset Flow ---
router.post('/request-password-reset', requestPasswordReset);
router.get('/reset-password/:token', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/reset-password/${req.params.token}`);
});
router.post('/reset-password', resetPassword);

// --- User Profile Routes (Protected) ---
router.get('/profile', authenticate_user, getProfile);

// --- Debugging Route (Consider removing in production) ---
router.get('/readtoken', readtoken);

// --- Resend Verification Email ---
router.post('/resend-verification', resendVerificationEmail);

// --- Avatar Upload Route (Protected) ---
router.post('/avatar', authenticate_user, uploadMiddleware, uploadAvatar);

// --- Change Email Verification Request Route (Protected) ---
router.post('/request-email-verification', authenticate_user, requestEmailVerification);

export default router;