import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import { mongoDb } from './config.js'; // Assuming mongoDb is defined correctly here
import eventRoutes from './routes/events.js';
import notificationRoutes from './routes/notifications.js';
import admine from './routes/admine.js'; // Assuming this is admin routes
import userRoutes from './routes/user.js';
import quizRoutes from './routes/quizRoutes.js';
import creatingQuizRoutes from './routes/creatingquiz.js';
import OrganizerLoginRoutes from './routes/OrganizerRoute.js'; // Renamed to clarify its purpose
import { authenticate_organizer } from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});

io.on('connection', async (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('Set', async (value) => {
    console.log('Received Set event:', value);
    socket.broadcast.emit('Set', value);
    await mongoDb.collection('quizzes').updateOne(
      { name: socket.quizname }, // Ensure socket.quizname is set when joining quiz
      { $set: { flag: value } }
    );
  });

  socket.on('array', async () => {
    console.log('Received array event');
    // Ensure socket.quiz_id is set when joining quiz
    const responses = await mongoDb.collection('user_responses').find({ quiz_id: socket.quiz_id }).toArray(); 
    socket.emit('arraydata', responses.map(r => `${r.user_id}: ${r.score}`));
  });

  socket.on('joinQuiz', async (quizname) => {
    const quiz = await mongoDb.collection('quizzes').findOne({ name: quizname });
    if (quiz) { // Check if quiz exists
      socket.quiz_id = quiz._id;
      socket.quizname = quizname;
      socket.join(quizname);
      console.log(`Socket ${socket.id} joined quiz ${quizname}`);
    } else {
      console.warn(`Quiz "${quizname}" not found for socket ${socket.id}`);
      // Optionally, emit an error back to the client
      socket.emit('quizNotFound', quizname);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Keep Authorization for future token headers if used
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- ROUTES ---

// FIX: Mount the OrganizerLoginRoutes ONLY for the /organizer-login path
// This handles the POST request for login.
app.use('/organizer-login', OrganizerLoginRoutes); // Correctly mounts the router

// All other API routes
app.use('/users', userRoutes);
app.use('/admine', admine); // Admin routes (assuming these need admin auth)
app.use('/events', eventRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/quizzes', quizRoutes);

// Protected routes requiring organizer authentication
app.use('/api/creatingquiz', authenticate_organizer, creatingQuizRoutes);

// Protect the /create-quiz page access itself (frontend will hit this GET endpoint)
app.get('/create-quiz', authenticate_organizer, (req, res) => {
  res.status(200).json({ message: 'Access granted to create quiz' });
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});