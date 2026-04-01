import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { role } from '../middleware/role.js';
import {
  getDashboard, getRevenue, getReports,
  getUsers, getUserDetail, updateUser, deleteUser,
  toggleUserLock, changeUserRole,
  getAllEvents, updateEvent, deleteEvent, getEventRegistrations
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require auth + ADMIN role
router.use(auth, role('ADMIN'));

router.get('/dashboard', getDashboard);
router.get('/revenue', getRevenue);
router.get('/reports', getReports);

router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/toggle', toggleUserLock);
router.post('/users/:id/role', changeUserRole);

router.get('/events', getAllEvents);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
router.get('/events/:id/registrations', getEventRegistrations);

export default router;
