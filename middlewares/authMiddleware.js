import jwt from "jsonwebtoken";
import { db } from '../config.js';

export const authenticate_user = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};

export const authenticate_admin = async (req, res, next) => {
  const token = req.cookies.token; // Changed from headers to cookies
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.query("SELECT role FROM users WHERE email = $1", [decoded.email]);
    if (!user.rows[0] || user.rows[0].role !== 'admin') return res.status(403).json({ error: "Unauthorized: Admin access required" });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authenticate_organizer = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.query("SELECT role FROM users WHERE email = $1", [decoded.email]);
    if (!user.rows[0] || user.rows[0].role !== 'organizer') {
      return res.status(403).json({ error: "Unauthorized: Only organizers can access this" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};