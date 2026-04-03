import express from 'express';
import { auth } from '../middleware/auth.js';
import { getChatHistory } from '../controllers/chatController.js';

const router = express.Router();

router.get('/history', auth, getChatHistory);

export default router;
