import { db, mongoDb } from "../config.js";
import {
  sendVerificationEmail,
  // sendresetpassword is not used in this file
} from "../services/emailService.js";

/**
 * Registers a team for an event after performing comprehensive uniqueness checks.
 * A team can have 1, 2, or 3 members.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const eventRegistration = async (req, res) => {
  const {
    teamLeaderName,
    teamLeaderId,
    leadMailId,
    teamName,
    MemberI,
    MemberIid,
    MemberII,
    MemberIIid,
  } = req.body.data;

  // --- Core Validation: A team must have a leader and a name. ---
  if (!teamLeaderName || !teamLeaderId || !leadMailId || !teamName) {
    return res
      .status(400)
      .json({ message: "Team leader details and team name are required." });
  }

  try {
    // --- Performance Improvement: Check for all conflicts in a SINGLE database query ---
    const conflictCheckQuery = `
      SELECT teamname, leadmailid 
      FROM eventregistration 
      WHERE teamname = $1 
         OR leadmailid = $2 
         OR teamleaderid = ANY($3) 
         OR memberiid = ANY($3) 
         OR memberiiid = ANY($3)
    `;

    // Collect all provided member IDs to check for conflicts. Filter out any null/empty values.
    const allMemberIds = [teamLeaderId, MemberIid, MemberIIid].filter(
      (id) => id
    );

    const conflictResult = await db.query(conflictCheckQuery, [
      teamName,
      leadMailId,
      allMemberIds,
    ]);

    if (conflictResult.rows.length > 0) {
      // --- Clearer Conflict Response ---
      const existing = conflictResult.rows[0];
      if (existing.teamname === teamName) {
        return res
          .status(409)
          .json({ message: `Team name '${teamName}' is already taken.` });
      }
      if (existing.leadmailid === leadMailId) {
        return res
          .status(409)
          .json({ message: `Email '${leadMailId}' is already registered.` });
      }
      return res.status(409).json({
        message:
          "One or more team members are already registered in another team.",
      });
    }

    // --- Robustness Improvement: Use explicit column names for the INSERT query ---
    const insertQuery = `
      INSERT INTO eventregistration(
        teamleadername, teamleaderid, leadmailid, teamname, 
        memberi, memberiid, memberii, memberiiid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await db.query(insertQuery, [
      teamLeaderName,
      teamLeaderId,
      leadMailId,
      teamName,
      MemberI || null,
      MemberIid || null, // Use null for optional members
      MemberII || null,
      MemberIIid || null,
    ]);

    res
      .status(201)
      .json({ ok: true, message: "Team registered successfully!" });
  } catch (error) {
    console.error("Error during event registration:", error);
    // --- Proper Error Handling: Always send a response on failure ---
    res.status(500).json({ message: "An internal server error occurred." });
  }
};

/**
 * Verifies a registered user and sends a time-sensitive OTP to their email for quiz access.
 * Implements a 5-minute cooldown to prevent spam.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const accessingquizroom = async (req, res) => {
  const { teamleademailid } = req.body.data;

  if (!teamleademailid) {
    return res.status(400).json({ message: "Team lead email is required." });
  }

  try {
    const result = await db.query(
      "SELECT timestamp FROM eventregistration WHERE leadmailid=$1",
      [teamleademailid]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "This email is not registered for the event." });
    }

    // --- Cooldown Logic ---
    const lastRequestTimestamp = result.rows[0].timestamp;
    if (lastRequestTimestamp) {
      const timeDifference =
        (new Date() - new Date(lastRequestTimestamp)) / 1000 / 60; // Difference in minutes
      if (timeDifference <= 5) {
        const timeLeft = Math.ceil(5 - timeDifference);
        return res.status(429).json({
          message: `Please wait ${timeLeft} more minute(s) before requesting a new code.`,
        });
      }
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await sendVerificationEmail(teamleademailid, otp);

    // Update the record with the new OTP and the current timestamp (in UTC)
    await db.query(
      "UPDATE eventregistration SET teamkey=$1, timestamp=$2 WHERE leadmailid=$3",
      [otp, new Date(), teamleademailid]
    );

    // --- Security Improvement: Do NOT send the OTP back in the response. Force user to check email. ---
    res
      .status(200)
      .json({ message: "A verification code has been sent to your email." });
  } catch (error) {
    console.error("Error in accessingquizroom:", error);
    res.status(500).json({ message: "An internal server error occurred." });
  }
};

/**
 * Validates a user-provided OTP (key) to grant final access to the quiz.
 * The key is only valid for 5 minutes.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const accessingquizroombykey = async (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ message: "Access key is required." });
  }

  try {
    // --- Security Improvement: Check that the key is both correct AND recent. ---
    const query = `
      SELECT * FROM eventregistration 
      WHERE teamkey = $1 AND timestamp > NOW() - INTERVAL '5 minutes'
    `;
    const result = await db.query(query, [key]);

    if (result.rows.length > 0) {
      // Key is valid and recent
      res.status(200).json({ teamData: result.rows[0] });
    } else {
      // Key is incorrect or has expired
      res.status(404).json({ message: "Invalid or expired access key." });
    }
  } catch (error) {
    console.error("Error accessing quiz room by key:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
