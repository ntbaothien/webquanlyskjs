import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import {
  getEmailHistory,
  getReminderStats,
  sendManualReminder,
  getReminderSummary
} from '../controllers/reminderController.js';

const router = Router();

// All reminder routes require authentication
router.use(auth);

/**
 * GET /api/reminders/summary
 * Get organizer's reminder summary
 */
router.get('/summary', getReminderSummary);

/**
 * GET /api/reminders/events/:eventId
 * Get email history for an event
 */
router.get('/events/:eventId', getEmailHistory);

/**
 * GET /api/reminders/events/:eventId/stats
 * Get email statistics for an event
 */
router.get('/events/:eventId/stats', getReminderStats);

/**
 * POST /api/reminders/events/:eventId/send
 * Organizer manually send reminder
 */
router.post('/events/:eventId/send', sendManualReminder);

export default router;
