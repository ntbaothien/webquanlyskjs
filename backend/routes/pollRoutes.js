import express from 'express';
import { createPoll, getEventPolls, votePoll, closePoll, deletePoll } from '../controllers/pollController.js';
import { auth } from '../middleware/auth.js';
import { role } from '../middleware/role.js';

const router = express.Router();

router.get('/event/:eventId', getEventPolls);
router.post('/', auth, role(['ORGANIZER', 'ADMIN']), createPoll);
router.put('/:id/vote', auth, votePoll);
router.put('/:id/close', auth, role(['ORGANIZER', 'ADMIN']), closePoll);
router.delete('/:id', auth, role(['ORGANIZER', 'ADMIN']), deletePoll);

export default router;
