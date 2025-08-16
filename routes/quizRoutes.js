import express from 'express';
import { getAllQuizzes, createQuiz, deleteQuiz, updateQuizTimer, getQuizTimer, reviewQuiz } from '../controllers/quizManagerController.js';
import { authenticate_admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate_admin, getAllQuizzes);
router.post('/', authenticate_admin, createQuiz);
router.delete('/:name', authenticate_admin, deleteQuiz);
router.put('/:name/timer', authenticate_admin, updateQuizTimer);
router.get('/:name/timer', getQuizTimer);
router.put('/:name/review', authenticate_admin, reviewQuiz);

export default router;