import { Router } from 'express';
import { auth, optionalAuth } from '../middleware/auth.js';
import {
  getEvents, getTrending, getFeatured, getTags, getLocations,
  getEventById, getSimilar, getReviews, createReview,
  registerEvent, holdSeats, bookEvent, reportEvent, getMyReport,
  addToWaitlist, removeFromWaitlist, getWaitlistStatus, getMyWaitlist,
  getRecommended
} from '../controllers/eventController.js';

const router = Router();

// Public
router.get('/', getEvents);
router.get('/trending', getTrending);
router.get('/featured', getFeatured);
router.get('/tags', getTags);
router.get('/locations', getLocations);
router.get('/recommended', optionalAuth, getRecommended);

// My waitlist (must be before /:id)
router.get('/waitlist/my', auth, getMyWaitlist);

// Event detail — optionalAuth to check alreadyRegistered
router.get('/:id', optionalAuth, getEventById);

// Reviews
router.get('/:id/similar', getSimilar);
router.post('/:id/waitlist', auth, addToWaitlist);
router.delete('/:id/waitlist', auth, removeFromWaitlist);
router.get('/:id/waitlist-status', auth, getWaitlistStatus);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', auth, createReview);

// Registration & Booking
router.post('/:id/register', auth, registerEvent);
router.post('/:id/hold', auth, holdSeats);  // Giữ chỗ 5 phút
router.post('/:id/book', auth, bookEvent);

// Report / Violation
router.post('/:id/report', auth, reportEvent);
router.get('/:id/my-report', auth, getMyReport);

export default router;
