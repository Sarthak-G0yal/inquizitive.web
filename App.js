import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import { mongoDb } from "./config.js";
import eventRoutes from "./routes/events.js";
import notificationRoutes from "./routes/notifications.js";
import admine from "./routes/admine.js";
import userRoutes from "./routes/user.js";
import quizRoutes from "./routes/quizRoutes.js";
import creatingQuizRoutes from "./routes/creatingquiz.js";
// FIX 1: Import the correct admin authentication middleware
import { authenticate_admin } from "./middlewares/authMiddleware.js";
// FIX 2: The organizer-specific login routes are no longer needed
// import OrganizerLoginRoutes from './routes/OrganizerRoute.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
});

// ... (your socket.io logic remains the same)
io.on("connection", async (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("Set", async (value) => {
    console.log("Received Set event:", value);
    socket.broadcast.emit("Set", value);
    await mongoDb
      .collection("quizzes")
      .updateOne({ name: socket.quizname }, { $set: { flag: value } });
  });

  socket.on("array", async () => {
    console.log("Received array event");
    const responses = await mongoDb
      .collection("user_responses")
      .find({ quiz_id: socket.quiz_id })
      .toArray();
    socket.emit(
      "arraydata",
      responses.map((r) => `${r.user_id}: ${r.score}`)
    );
  });

  socket.on("joinQuiz", async (quizname) => {
    const quiz = await mongoDb
      .collection("quizzes")
      .findOne({ name: quizname });
    if (quiz) {
      socket.quiz_id = quiz._id;
      socket.quizname = quizname;
      socket.join(quizname);
      console.log(`Socket ${socket.id} joined quiz ${quizname}`);
    } else {
      console.warn(`Quiz "${quizname}" not found for socket ${socket.id}`);
      socket.emit("quizNotFound", quizname);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- ROUTES ---

// FIX 2: Remove the obsolete organizer login route
// app.use('/organizer-login', OrganizerLoginRoutes);

// All other API routes
app.use("/users", userRoutes);
app.use("/admine", admine);
app.use("/events", eventRoutes);
app.use("/notifications", notificationRoutes);
app.use("/api/quizzes", quizRoutes);

// FIX 3: Protect the quiz creation routes with the ADMIN middleware
app.use("/api/creatingquiz", authenticate_admin, creatingQuizRoutes);

// FIX 4: Protect the GET route with the ADMIN middleware as well
app.get("/create-quiz", authenticate_admin, (req, res) => {
  res.status(200).json({ message: "Access granted to create quiz" });
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
