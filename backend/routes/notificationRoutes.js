import express from 'express';
import { getNotifications, markAsRead, deleteNotification } from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getNotifications);
router.put('/:id/read', auth, markAsRead);
router.delete('/:id', auth, deleteNotification);

export default router;
