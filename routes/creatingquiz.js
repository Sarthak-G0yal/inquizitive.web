import express from "express";
import { mongoDb } from "../config.js"; // Ensure this import is present
import multer from "multer";

const router = express.Router();
const upload = multer();

console.log("Registering /setQuizNameToFile route"); // Debug log
router.post("/setQuizNameToFile", async (req, res) => {
  const { name, total_rounds, has_buzzer_round, round_questions } = req.body;
  try {
    if (!name) throw new Error("Quiz name is required");
    if (!req.user || !req.user.id)
      throw new Error("Unauthorized: User not authenticated");

    const result = await mongoDb.collection("quizzes").insertOne({
      name,
      author_id: req.user.id,
      status: "pending",
      total_rounds: total_rounds || 1,
      has_buzzer_round: has_buzzer_round || false,
      round_questions: round_questions || {},
      created_at: new Date(),
      updated_at: new Date(),
    });
    res.status(200).json({
      message: "Quiz created successfully",
      quiz_id: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res
      .status(500)
      .json({ error: "Failed to create quiz", details: error.message });
  }
});

console.log("Registering /questionsForQuiz route"); // Debug log
router.get("/questionsForQuiz", async (req, res) => {
  const { name } = req.query;
  try {
    const quiz = await mongoDb.collection("quizzes").findOne({ name });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    const questions = await mongoDb
      .collection("questions")
      .find({ quiz_id: quiz._id })
      .toArray();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

console.log("Registering /nextQuestionIndex route"); // Debug log
router.get("/nextQuestionIndex", async (req, res) => {
  const { quiz_name, round } = req.query;
  try {
    const quiz = await mongoDb
      .collection("quizzes")
      .findOne({ name: quiz_name });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    const count = await mongoDb
      .collection("questions")
      .countDocuments({ quiz_id: quiz._id, round_number: parseInt(round) });
    res.json({ nextIndex: count + 1 });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch next index" });
  }
});

console.log("Registering /addQuestion route"); // Debug log

// --- APPLY THE FIX TO THE /addQuestion ROUTE ---
router.post("/addQuestion", upload.none(), async (req, res) => {
  // <--- CHANGE #3: Add "upload.none()" middleware here

  console.log("Received addQuestion request with parsed body:", req.body); // This will now show the correct data

  const {
    quiz_name,
    round_number,
    index,
    question,
    questionType,
    answer,
    description,
    marks,
    negative_marks,
    skip_marks,
  } = req.body;
  const options = [];
  for (let i = 1; i <= 4; i++) {
    if (req.body[`options${i}`]) {
      options.push({ text: req.body[`options${i}`], isCorrect: false });
    }
  }

  // This line had a bug for single-correct. It should check if the option text matches the answer.
  if (questionType === "single-correct" && answer) {
    const correctOption = options.find((o) => o.text === answer);
    if (correctOption) {
      correctOption.isCorrect = true;
    }
  }

  const quiz = await mongoDb.collection("quizzes").findOne({ name: quiz_name });
  if (!quiz) {
    console.error(`Quiz not found with name: "${quiz_name}"`); // Add better logging
    return res.status(404).json({ error: "Quiz not found" });
  }

  const questionData = {
    quiz_id: quiz._id,
    round_number: parseInt(round_number),
    index: parseInt(index),
    question,
    type: questionType,
    options,
    answer,
    description,
    media: req.body.file_type
      ? { type: req.body.file_type, url: req.body.image || "" }
      : null,
    marks: parseInt(marks) || 0,
    negative_marks: parseInt(negative_marks) || 0,
    skip_marks: parseInt(skip_marks) || 0,
    created_at: new Date(),
  };

  try {
    await mongoDb.collection("questions").insertOne(questionData);
    res.status(200).json({ message: "Question added successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to add question", details: error.message });
  }
});

export default router;
