import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getMe, updateMe, changeMyPassword,
  getMyStats, getMySaved, toggleSaveEvent, unsaveEvent,
  requestTopup, getMyTransactions, getLoyaltyInfo
} from '../controllers/userController.js';

const router = Router();

router.use(auth);

// /api/users/me — profile endpoints that frontend calls
router.get('/me', getMe);
router.put('/me', upload.single('avatarFile'), updateMe);
router.put('/me/password', changeMyPassword);
router.get('/me/stats', getMyStats);
router.get('/me/saved', getMySaved);
router.post('/me/saved/:eventId', toggleSaveEvent);
router.delete('/me/saved/:eventId', unsaveEvent);

// Wallet / Top-up
router.post('/me/topup', requestTopup);
router.get('/me/transactions', getMyTransactions);

// Gamification
router.get('/me/loyalty', getLoyaltyInfo);

export default router;
