import { db, mongoDb } from "../config.js";
import { authenticate_admin } from "../middlewares/authMiddleware.js";

const sendError = (res, statusCode, message) =>
  res.status(statusCode).json({ error: message });
const sendSuccess = (res, statusCode, data) =>
  res.status(statusCode).json(data);

export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await mongoDb.collection("quizzes").find({}).toArray();
    res.status(200).json(quizzes);
  } catch (err) {
    console.error("Error fetching all quizzes:", err);
    res.status(500).json({ error: "Server error while fetching quizzes." });
  }
};

export const createQuiz = async (req, res) => {
  const { name, duration } = req.body;
  if (!name || !duration)
    return sendError(res, 400, "Name and duration are required");
  try {
    const result = await mongoDb
      .collection("quizzes")
      .insertOne({ name, duration, created_at: new Date(), status: "pending" });
    sendSuccess(res, 201, {
      message: "Quiz created",
      quiz: { _id: result.insertedId, name, duration },
    });
  } catch (err) {
    console.error("Error creating quiz:", err);
    sendError(res, 500, "Failed to create quiz");
  }
};

export const deleteQuiz = async (req, res) => {
  const { name } = req.params;
  try {
    // Step 1: Find the quiz FIRST to get its ID.
    const quiz = await mongoDb.collection("quizzes").findOne({ name });

    // Step 2: If it's not found, send a 404.
    if (!quiz) {
      return sendError(res, 404, "Quiz not found");
    }

    const quizId = quiz._id;

    // Step 3: Delete all questions associated with that ID.
    await mongoDb.collection("questions").deleteMany({ quiz_id: quizId });

    // Step 4: NOW delete the quiz document itself.
    const result = await mongoDb
      .collection("quizzes")
      .deleteOne({ _id: quizId });

    if (result.deletedCount === 0) {
      // This case should be rare, but it's good practice to handle it.
      return sendError(
        res,
        500,
        "Failed to delete quiz after deleting questions."
      );
    }

    sendSuccess(res, 200, {
      message: "Quiz and associated questions deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting quiz:", err);
    sendError(res, 500, "Failed to delete quiz");
  }
};

export const updateQuizDetails = async (req, res) => {
  const { name } = req.params;
  const { date, time, duration } = req.body;

  if (!date || !time || !duration) {
    return sendError(res, 400, "Date, time, and duration are required.");
  }

  try {
    const result = await mongoDb.collection("quizzes").updateOne(
      { name },
      {
        $set: {
          date: new Date(date), // Store as a proper Date object
          time,
          duration: parseInt(duration, 10),
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return sendError(res, 404, "Quiz not found");
    }

    sendSuccess(res, 200, { message: "Quiz details updated successfully" });
  } catch (err) {
    console.error("Error updating quiz details:", err);
    sendError(res, 500, "Failed to update quiz details");
  }
};

export const getQuizTimer = async (req, res) => {
  const { name } = req.params;
  try {
    const quiz = await mongoDb.collection("quizzes").findOne({ name });
    if (!quiz) return sendError(res, 404, "Quiz not found");
    sendSuccess(res, 200, { duration: quiz.duration || 300 });
  } catch (err) {
    sendError(res, 500, "Failed to fetch timer");
  }
};

export const reviewQuiz = async (req, res) => {
  const { name } = req.params;
  const { status, comments, skipReview } = req.body;
  try {
    const quiz = await mongoDb.collection("quizzes").findOne({ name });
    if (!quiz) return sendError(res, 404, "Quiz not found");
    if (skipReview && req.user.role === "admin") {
      await mongoDb.collection("quizzes").updateOne(
        { name },
        {
          $set: {
            status: "approved",
            reviewed_by: req.user.email,
            review_comments: comments || "Skipped review",
          },
        }
      );
    } else if (status && ["approved", "rejected"].includes(status)) {
      await mongoDb.collection("quizzes").updateOne(
        { name },
        {
          $set: {
            status,
            reviewed_by: req.user.email,
            review_comments: comments || null,
          },
        }
      );
    } else {
      return sendError(res, 400, "Invalid status or missing skipReview flag");
    }
    sendSuccess(res, 200, { message: "Quiz reviewed" });
  } catch (err) {
    sendError(res, 500, "Failed to review quiz");
  }
};
