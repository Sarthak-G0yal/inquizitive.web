import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, mongoDb } from "../config.js";
import {
  sendVerificationEmail,
  sendresetpassword,
} from "../services/emailService.js";

const saltRounds = 10;
const sendError = (res, statusCode, message) =>
  res.status(statusCode).json({ error: message });
const sendSuccess = (res, statusCode, data) =>
  res.status(statusCode).json(data);

// --- User Registration ---
export const register = async (req, res) => {
  const { email, phone_number, password, name } = req.body;
  if (!email || !password || !name) {
    return sendError(res, 400, "Name, email, and password are required.");
  }
  if (!email.endsWith("@iiitdwd.ac.in")) {
    return sendError(
      res,
      400,
      "Please use your official college email address."
    );
  }
  try {
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return sendError(res, 409, "An account with this email already exists.");
    }
    const password_hash = await bcrypt.hash(password, saltRounds);
    const verification_token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    await db.query(
      "INSERT INTO users (email, phone_number, password_hash, user_name, verification_token, verified) VALUES ($1, $2, $3, $4, $5, FALSE)",
      [email, phone_number, password_hash, name, verification_token]
    );
    console.log("Stored Verification Token:", verification_token); // Debug the stored token
    try {
      const verification_link = `${process.env.FRONTEND_URL}/verify-email/${verification_token}`;
      await sendVerificationEmail(email, verification_link);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Continue without failing the registration
    }
    return sendSuccess(res, 201, {
      message:
        "Registration successful. Please check your email to verify your account (email sending may not work yet).",
    });
  } catch (err) {
    console.error("Registration Error:", err);
    return sendError(
      res,
      500,
      "An internal server error occurred during registration."
    );
  }
};

// --- Email Verification ---
export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email } = decoded;
    console.log("Decoded Email:", email, "Token:", token);
    const { rows } = await db.query(
      "SELECT id, verified, verification_token FROM users WHERE email = $1 AND verification_token = $2",
      [email, token]
    );
    console.log("Query Result with Token:", rows);
    if (rows.length === 0) {
      return sendError(
        res,
        404,
        "Verification failed: User or token not found."
      );
    }
    if (rows[0].verified) {
      return sendSuccess(res, 200, {
        message: "This account has already been verified. You can log in.",
      });
    }

    const updateResult = await db.query(
      "UPDATE users SET verified = TRUE, verification_token = NULL WHERE email = $1 AND verification_token = $2",
      [email, token]
    );
    console.log("Update Result:", updateResult.rowCount); // Log rows affected
    if (updateResult.rowCount === 0) {
      return sendError(res, 500, "Failed to update verification status.");
    }

    return sendSuccess(res, 200, {
      message: "Email verified successfully! You can now log in.",
      redirect: "/client-login?message=success", // Suggest redirect
    });
  } catch (error) {
    console.error("Email Verification Error:", error);
    return sendError(res, 400, "Verification link is invalid or has expired.");
  }
};

// --- User Login ---
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = rows[0];
    if (user.role === "admin") {
      return res
        .status(403)
        .json({ error: "Use the admin login page for admin accounts" });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    if (!user.verified) {
      return res.status(403).json({ error: "Please verify your email" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 3600000,
    });
    return res.status(200).json({ message: "Login successful", redirect: "/" });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// --- User Logout ---
export const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
  });
  return sendSuccess(res, 200, { message: "Logout successful." });
};

// --- Request Password Reset ---
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return sendError(res, 400, "Email address is required.");
  }
  try {
    const { rows } = await db.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email]
    );
    if (rows.length === 0) {
      return sendSuccess(res, 200, {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }
    const user = rows[0];
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendresetpassword(email, resetLink);
    return sendSuccess(res, 200, {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("Request Password Reset Error:", err);
    return sendError(res, 500, "An internal server error occurred.");
  }
};

// --- Reset Password with Token ---
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return sendError(res, 400, "Token and new password are required.");
  }
  // Match frontend password rules
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return sendError(
      res,
      400,
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character."
    );
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = decoded;
    const password_hash = await bcrypt.hash(password, saltRounds);
    await db.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [password_hash, id]
    );
    return sendSuccess(res, 200, {
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return sendError(res, 401, "Invalid or expired password reset token.");
  }
};

// --- Get User Profile ---
export const getProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      "SELECT id, user_name, email, phone_number, created_at FROM users WHERE id = $1",
      [userId]
    );
    const user = rows[0];
    if (!user) {
      return sendError(res, 404, "User not found.");
    }
    return sendSuccess(res, 200, user);
  } catch (err) {
    console.error("Get Profile Error:", err);
    return sendError(res, 500, "An internal server error occurred.");
  }
};

// --- Get Current User (me) ---

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Fetching user with ID:", userId);
    const { rows } = await db.query(
      // FIX: Include 'role' in the SELECT statement
      "SELECT id, user_name, email, phone_number, avatar_url AS avatar, role FROM users WHERE id = $1",
      [userId]
    );
    const user = rows[0];
    if (!user) {
      return sendError(res, 404, "User not found.");
    }
    console.log("User data returned:", user); // Now this log will show the role
    return sendSuccess(res, 200, user);
  } catch (err) {
    console.error("Get Me Error:", err);
    return sendError(res, 500, "An internal server error occurred.");
  }
};

// --- Update User Profile ---
export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { user_name, phone_number, email, currentPassword, password } =
    req.body;

  try {
    let query = "UPDATE users SET updated_at = NOW()";
    const params = [];
    let paramIndex = 1;

    if (user_name) {
      query += `, user_name = $${paramIndex}`;
      params.push(user_name);
      paramIndex++;
    }
    if (phone_number) {
      query += `, phone_number = $${paramIndex}`;
      params.push(phone_number);
      paramIndex++;
    }
    if (email) {
      query += `, email = $${paramIndex}`;
      params.push(email);
      paramIndex++;
    }
    if (password && currentPassword) {
      const user = await db.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId]
      );
      const isMatch = await bcrypt.compare(
        currentPassword,
        user.rows[0].password_hash
      );
      if (!isMatch) {
        return sendError(res, 401, "Current password is incorrect.");
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password_hash = $${paramIndex}`;
      params.push(hashedPassword);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} RETURNING id, user_name, email, phone_number`;
    params.push(userId);

    const { rows } = await db.query(query, params);

    if (rows.length === 0) {
      return sendError(res, 404, "User not found.");
    }

    return sendSuccess(res, 200, {
      message: "Profile updated successfully",
      user: rows[0],
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return sendError(res, 500, "An internal server error occurred.");
  }
};

// --- Read Token ---
export const readtoken = (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  } else {
    res.status(200).json({ success: true });
  }
};

// --- Resend Verification Email ---
export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return sendError(res, 400, "Email address is required.");
  }
  try {
    const { rows } = await db.query(
      "SELECT id, verification_token, verified FROM users WHERE email = $1",
      [email]
    );
    if (rows.length === 0) {
      return sendError(res, 404, "User not found.");
    }
    const user = rows[0];
    if (user.verified) {
      return sendSuccess(res, 200, {
        message: "This account is already verified. You can log in.",
      });
    }
    if (!user.verification_token) {
      const newVerificationToken = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      await db.query(
        "UPDATE users SET verification_token = $1 WHERE email = $2",
        [newVerificationToken, email]
      );
    }
    const verification_link = `${process.env.FRONTEND_URL}/verify-email/${
      user.verification_token || newVerificationToken
    }`;
    await sendVerificationEmail(email, verification_link);
    return sendSuccess(res, 200, {
      message: "Verification email has been resent. Please check your inbox.",
    });
  } catch (err) {
    console.error("Resend Verification Email Error:", err);
    return sendError(res, 500, "An internal server error occurred.");
  }
};

export const requestEmailVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;
    if (!validateEmail(newEmail)) {
      return sendError(res, 400, "Invalid email format. Use @iiitdwd.ac.in.");
    }
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [newEmail]
    );
    if (existingUser.rows.length > 0) {
      return sendError(res, 409, "This email is already registered.");
    }
    const verificationToken = jwt.sign(
      { id: userId, newEmail },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    await db.query(
      "UPDATE users SET temp_email = $1, temp_verification_token = $2 WHERE id = $3",
      [newEmail, verificationToken, userId]
    );
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email-change/${verificationToken}`;
    await sendVerificationEmail(newEmail, verificationLink);
    return sendSuccess(res, 200, {
      message: "Verification email sent.",
      verificationToken,
    });
  } catch (err) {
    console.error("Email Verification Request Error:", err);
    return sendError(res, 500, "Failed to request email verification.");
  }
};

// Add this helper function
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@iiitdwd.ac.in$/;
  return emailRegex.test(email);
};

// --- Upload User Avatar ---
export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Controller received fileUrl:", req.fileUrl); // Debug: Log fileUrl
    if (!req.fileUrl) {
      return sendError(res, 400, "No file uploaded.");
    }

    const avatarUrl = req.fileUrl;
    await db.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [
      avatarUrl,
      userId,
    ]);

    const { rows } = await db.query(
      "SELECT id, user_name, email, phone_number, avatar_url AS avatar FROM users WHERE id = $1",
      [userId]
    );

    if (rows.length === 0) {
      return sendError(res, 404, "User not found.");
    }

    return sendSuccess(res, 200, rows[0]);
  } catch (err) {
    console.error("Avatar Upload Error:", err);
    if (err.message === "Only images (jpeg, jpg, png, gif) are allowed!") {
      return sendError(res, 400, err.message);
    }
    return sendError(res, 500, "Failed to upload avatar.");
  }
};
