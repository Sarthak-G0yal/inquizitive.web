import express from 'express';
import { sendNotification } from '../controllers/notificationController.js';
// import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/email', sendNotification);

export default router;
