import express from 'express';
import { getResources, createResource, updateResource, deleteResource } from '../controllers/resourceController.js';
import { auth } from '../middleware/auth.js';
import { role } from '../middleware/role.js';

const router = express.Router();

router.get('/:eventId', auth, getResources);
router.post('/', auth, role('ORGANIZER', 'ADMIN'), createResource);
router.put('/:id', auth, role('ORGANIZER', 'ADMIN'), updateResource);
router.delete('/:id', auth, role('ORGANIZER', 'ADMIN'), deleteResource);

export default router;
