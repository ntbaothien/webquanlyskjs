import { Router } from 'express';
import { auth, optionalAuth } from '../middleware/auth.js';
import {
  getEvents, getTrending, getFeatured, getTags, getLocations,
  getEventById, getSimilar, getReviews, createReview,
  registerEvent, bookEvent, reportEvent, getMyReport
} from '../controllers/eventController.js';

const router = Router();

// Public
router.get('/', getEvents);
router.get('/trending', getTrending);
router.get('/featured', getFeatured);
router.get('/tags', getTags);
router.get('/locations', getLocations);

// Event detail — optionalAuth to check alreadyRegistered
router.get('/:id', optionalAuth, getEventById);

// Reviews
router.get('/:id/similar', getSimilar);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', auth, createReview);

// Registration & Booking
router.post('/:id/register', auth, registerEvent);
router.post('/:id/book', auth, bookEvent);

// Report / Violation
router.post('/:id/report', auth, reportEvent);
router.get('/:id/my-report', auth, getMyReport);

export default router;
