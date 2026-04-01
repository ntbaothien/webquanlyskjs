import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getProfile, updateProfile, changePassword,
  getSavedEvents, toggleSaveEvent
} from '../controllers/profileController.js';

const router = Router();

router.use(auth);

router.get('/', getProfile);
router.put('/', upload.single('avatarFile'), updateProfile);
router.put('/password', changePassword);
router.get('/saved-events', getSavedEvents);
router.post('/saved-events/:eventId', toggleSaveEvent);

export default router;
