import express from 'express';
import { 
  getForumPostsByEvent, 
  addForumPost, 
  addForumComment, 
  deleteForumPost 
} from '../controllers/forumController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Public route to view posts
router.get('/event/:eventId', getForumPostsByEvent);

// Protected routes to interact
router.post('/', auth, addForumPost);
router.post('/:postId/comment', auth, addForumComment);
router.delete('/:id', auth, deleteForumPost);

export default router;
