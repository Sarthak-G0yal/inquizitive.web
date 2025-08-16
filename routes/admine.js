import express from 'express';
import { addMember, membersDetail, blockuser, unblockuser } from '../controllers/adminecontroller.js';
import { authenticate_admin } from '../middlewares/authMiddleware.js';
import { db } from '../config.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message });
const sendSuccess = (res, statusCode, data) => res.status(statusCode).json(data);

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required');
  }
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return sendError(res, 404, 'User not found');
    }
    const user = rows[0];
    if (user.role !== 'admin') {
      return sendError(res, 403, 'This login is for admins only');
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 401, 'Incorrect password');
    }
    if (!user.verified) {
      return sendError(res, 403, 'Please verify your email');
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 3600000 });
    return sendSuccess(res, 200, { message: 'Admin login successful' });
  } catch (err) {
    console.error('Admin login error:', err);
    return sendError(res, 500, 'Internal server error');
  }
});

router.post('/addMember', authenticate_admin, addMember);
router.get('/membersDetail', authenticate_admin, membersDetail);
router.post('/blockuser', authenticate_admin, blockuser);
router.post('/unblockuser', authenticate_admin, unblockuser);

export default router;