import express from 'express';
import { db } from '../config.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const router = express.Router();

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message });
const sendSuccess = (res, statusCode, data) => res.status(statusCode).json(data);

router.post('/', async (req, res) => { // FIX: Changed path from '/organizer-login' to '/'
  console.log('Request body:', req.body);
  if (!req.body || typeof req.body !== 'object') {
    console.error('Invalid request body:', req.body);
    return sendError(res, 400, "Invalid request body");
  }
  const { email, password } = req.body;
  console.log('Received login attempt:', { email, password });
  try {
    const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    console.log('Database query result:', user.rows);
    if (user.rows.length === 0) {
      console.log('User not found for email:', email);
      return sendError(res, 401, "Invalid email or password."); // Generic error for security
    }
    const userData = user.rows[0];
    console.log('User data fetched:', userData);

    // FIX: Simplified role check - rely solely on the database role
    if (userData.role !== 'organizer') {
      console.log('Unauthorized access attempt by non-organizer role:', email, 'Role:', userData.role);
      return sendError(res, 403, "Unauthorized: Access restricted to organizers.");
    }

    const isMatch = await bcrypt.compare(password, userData.password_hash);
    console.log('Password comparison result:', isMatch);
    if (!isMatch) {
      console.log('Password mismatch for email:', email);
      return sendError(res, 401, "Invalid email or password."); // Generic error for security
    }
    if (!userData.verified) {
      console.log('Email not verified for:', email);
      return sendError(res, 403, "Please verify your email to log in.");
    }
    const token = jwt.sign({ id: userData.id, email: userData.email, role: userData.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log('Generated token:', token);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 });
    return sendSuccess(res, 200, { message: 'Login successful', token });
  } catch (err) {
    console.error('Login error details:', err.stack);
    return sendError(res, 500, "Server error during login.");
  }
});

export default router;