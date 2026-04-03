import express from 'express';
import { 
  getResourcesByEvent, 
  addResource, 
  updateResource, 
  deleteResource 
} from '../controllers/resourceController.js';
import { auth } from '../middleware/auth.js';
import { role } from '../middleware/role.js';

const router = express.Router();

// All routes are protected and require Organizer or Admin role
router.use(auth);
router.use(role('ORGANIZER', 'ADMIN'));

router.get('/event/:eventId', getResourcesByEvent);
router.post('/', addResource);
router.put('/:id', updateResource);
router.delete('/:id', deleteResource);

export default router;
