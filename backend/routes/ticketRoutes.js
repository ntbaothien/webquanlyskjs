import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { role } from '../middleware/role.js';
import {
  getMyTickets, getTicketByCode, checkIn,
  getNotifications, markRead, markAllRead,
  getMyRegistrations, getMyBookings,
  cancelRegistration, cancelBooking
} from '../controllers/ticketController.js';

const router = Router();

// My registrations & bookings (separate endpoints for frontend)
router.get('/my-registrations', auth, getMyRegistrations);
router.get('/my-bookings', auth, getMyBookings);
router.delete('/registrations/:id', auth, cancelRegistration);
router.delete('/bookings/:id', auth, cancelBooking);

// Tickets
router.get('/my-tickets', auth, getMyTickets);
router.get('/tickets/:code', auth, getTicketByCode);
router.post('/tickets/:code/check-in', auth, role('ORGANIZER', 'ADMIN'), checkIn);

// Notifications
router.get('/notifications', auth, getNotifications);
router.put('/notifications/:id/read', auth, markRead);
router.put('/notifications/read-all', auth, markAllRead);

export default router;
