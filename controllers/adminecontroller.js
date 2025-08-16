import { db, mongoDb } from "../config.js";

const sendError = (res, statusCode, message) =>
  res.status(statusCode).json({ error: message });
const sendSuccess = (res, statusCode, data) =>
  res.status(statusCode).json(data);

export const blockuser = async (req, res) => {
  const { gmail } = req.body;
  if (!gmail) {
    return sendError(res, 400, "Email is required");
  }
  try {
    const result = await db.query(
      "INSERT INTO blocked_gmail (gmail) VALUES ($1) RETURNING *",
      [gmail]
    );
    return sendSuccess(res, 200, {
      message: "User blocked successfully",
      blocked: result.rows[0],
    });
  } catch (err) {
    console.error("Error blocking user:", err);
    return sendError(res, 500, "Failed to block user");
  }
};

export const unblockuser = async (req, res) => {
  const { gmail } = req.body;
  if (!gmail) {
    return sendError(res, 400, "Email is required");
  }
  try {
    const result = await db.query(
      "DELETE FROM blocked_gmail WHERE gmail = $1 RETURNING *",
      [gmail]
    );
    if (result.rowCount === 0) {
      return sendError(res, 404, "Email not found in blocked list");
    }
    return sendSuccess(res, 200, { message: "User unblocked successfully" });
  } catch (err) {
    console.error("Error unblocking user:", err);
    return sendError(res, 500, "Failed to unblock user");
  }
};

export const membersDetail = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM member");
    return sendSuccess(res, 200, result.rows);
  } catch (err) {
    console.error("Error fetching members:", err);
    return sendError(res, 500, "Failed to fetch members");
  }
};

export const addMember = async (req, res) => {
  const { image, name, role, about, instagram, linkedin, github } = req.body;
  if (!name || !role) {
    return sendError(res, 400, "Name and role are required");
  }
  try {
    const result = await db.query(
      "INSERT INTO member (image, name, role, about, instagram, linkedin, github) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        image || null,
        name,
        role,
        about || null,
        instagram || null,
        linkedin || null,
        github || null,
      ]
    );
    return sendSuccess(res, 200, {
      message: "Member added successfully",
      member: result.rows[0],
    });
  } catch (err) {
    console.error("Error adding member:", err);
    return sendError(res, 500, "Failed to add member");
  }
};
