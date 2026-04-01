import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { role } from '../middleware/role.js';
import { upload } from '../middleware/upload.js';
import {
  getMyEvents, createEvent, updateEvent, deleteEvent, getEventRegistrations
} from '../controllers/organizerController.js';

const router = Router();

// All organizer routes require auth + ORGANIZER or ADMIN role
router.use(auth, role('ORGANIZER', 'ADMIN'));

// Frontend calls both /organizer/events and /organizer/my-events
router.get('/events', getMyEvents);
router.get('/my-events', getMyEvents);
router.post('/events', upload.single('bannerFile'), createEvent);
router.put('/events/:id', upload.single('bannerFile'), updateEvent);
router.delete('/events/:id', deleteEvent);
router.get('/events/:id/registrations', getEventRegistrations);

export default router;
