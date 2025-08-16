import { db, mongoDb } from "../config.js";
import fs from "fs";
import uploadMiddleware from "../middlewares/upload.js";
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};
const firebaseApp = initializeApp(firebaseConfig);

export const uploadMediaQuestion = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(500).send("Error with file upload.");
    const fileUrl = req.fileUrl;
    const mediaType = req.body.mediaType;
    const questionId = req.body.questionId;
    if (!fileUrl) return res.status(400).send("No file uploaded.");
    try {
      const quiz = await mongoDb.collection('quizzes').findOne({ name: req.body.name || 'default' });
      if (!quiz) throw new Error("Quiz not found");
      await mongoDb.collection('questions').findOneAndUpdate(
        { question_id: parseInt(questionId), quiz_id: quiz._id },
        { $set: { "media.type": mediaType, "media.url": fileUrl } },
        { upsert: true }
      );
      res.status(200).json({ message: "File uploaded successfully." });
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).send("Error uploading file.");
    }
  });
};

export const setQuizNameToFile = async (req, res) => {
  const name = req.body.name;
  console.log("setQuizName", name);
  if (!name) return res.status(400).json({ message: "Quiz name is required" });
  try {
    await mongoDb.collection('quizzes').findOneAndUpdate(
      { name }, { $set: { name, created_at: new Date(), status: 'pending' } }, { upsert: true }
    );
  } catch (err) { console.log(err); }
  res.status(200).json({ message: "Quiz set successfully" });
};

export const getQuestion = async (req, res) => {
  try {
    const name = req.query.name || 'default';
    console.log("qizName getquestion", name);
    const quiz = await mongoDb.collection('quizzes').findOne({ name });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    if (quiz.status !== 'approved') return res.status(403).json({ error: "Quiz not approved" });
    const result = await mongoDb.collection('questions').find({ quiz_id: quiz._id }).toArray();
    res.status(200).json({ questions: result, quizName: name });
  } catch (err) {
    console.error("Error getting questions:", err);
    res.status(500).json({ error: "Failed to get questions" });
  }
};

export const getQuestionsForQuiz = async (req, res) => {
  try {
    const name = req.query.name || 'default';
    console.log("Fetching questions for quiz:", name);
    const quiz = await mongoDb.collection('quizzes').findOne({ name });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    const questions = await mongoDb.collection('questions').find({ quiz_id: quiz._id }).toArray();
    res.status(200).json(questions);
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

export const deleteQuestion = async (req, res) => {
  const questionId = req.body.question_id;
  if (!questionId) return res.status(400).json({ error: "Question ID is required" });
  try {
    const quiz = await mongoDb.collection('quizzes').findOne({ name: req.body.name || 'default' });
    if (!quiz) throw new Error("Quiz not found");
    const result = await mongoDb.collection('questions').deleteOne({ question_id: parseInt(questionId), quiz_id: quiz._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Question not found" });
    res.status(200).json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).json({ error: "Failed to delete question" });
  }
};

export const addMarks = async (req, res) => {
  const { marks, roomKey, quizName, timestamp } = req.body.data;
  console.log(marks, roomKey, quizName);
  try {
    if (!roomKey) return res.status(404).json({ ok: false, message: "Room key is missing." });
    const eventRegResponse = await db.query("SELECT leadmailid FROM eventregistration WHERE teamkey = $1", [roomKey]);
    if (eventRegResponse.rowCount === 0) return res.status(404).json({ ok: false, message: "Invalid room key." });
    const leadmailid = eventRegResponse.rows[0].leadmailid.trim();
    console.log("Lead Mail ID:", leadmailid);
    const quiz = await mongoDb.collection('quizzes').findOne({ name: quizName });
    if (!quiz || quiz.status !== 'approved') return res.status(403).json({ ok: false, message: "Quiz not approved or not found" });
    const existingSubmission = await mongoDb.collection('user_responses').findOne({ user_id: leadmailid, quiz_id: quiz._id });
    if (existingSubmission) {
      await mongoDb.collection('user_responses').updateOne(
        { _id: existingSubmission._id },
        { $set: { score: marks, timestamp: new Date(timestamp) } }
      );
    } else {
      await mongoDb.collection('user_responses').insertOne({
        quiz_id: quiz._id, user_id: leadmailid, score: marks, timestamp: new Date(timestamp), responses: []
      });
    }
    console.log("Marks successfully updated");
    res.status(200).json({ ok: true, message: "Marks successfully updated" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
};

export const getMarks = async (req, res) => {
  try {
    const quizName = req.query.name;
    console.log(quizName);
    if (!quizName) res.status(404).json({ ok: false, marks: "Marks are not being uploaded" });
    const quiz = await mongoDb.collection('quizzes').findOne({ name: quizName });
    if (!quiz || quiz.status !== 'approved') return res.status(403).json({ ok: false, message: "Quiz not approved or not found" });
    const response = await mongoDb.collection('user_responses').find({ quiz_id: quiz._id }).toArray();
    if (response.length === 0) res.status(404).json({ ok: false, marks: "no marks are uploaded" });
    const marksWithTeamname = await Promise.all(response.map(async (mark) => {
      const eventRegResult = await db.query("SELECT teamname FROM eventregistration WHERE leadmailid = $1", [mark.user_id.trim()]);
      return { leadmailid: mark.user_id.trim(), marks: mark.score, timestamp: mark.timestamp, teamname: eventRegResult.rows[0]?.teamname || "N/A" };
    }));
    if (marksWithTeamname.length > 0) res.status(200).json({ ok: true, marks: marksWithTeamname, quizName });
    else res.status(404).json({ ok: false, quizName });
  } catch (error) {
    console.error("Error in getMarks:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
};