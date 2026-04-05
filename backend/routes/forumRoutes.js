import express from 'express';
import { getForumPosts, createPost, addComment, deletePost } from '../controllers/forumController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:eventId', getForumPosts);
router.post('/', auth, createPost);
router.post('/:id/comment', auth, addComment);
router.delete('/:id', auth, deletePost);

export default router;
