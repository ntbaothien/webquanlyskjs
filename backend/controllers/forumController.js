import ForumPost from '../models/ForumPost.js';

export const getForumPosts = async (req, res) => {
  try {
    const posts = await ForumPost.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    console.log('--- CREATE FORUM POST ---');
    console.log('req.body:', req.body);
    console.log('req.user:', req.user?._id, req.user?.fullName);
    const post = await ForumPost.create({
      ...req.body,
      userId: req.user._id,
      userFullName: req.user.fullName
    });
    res.status(201).json(post);
  } catch (error) {
    console.error('Create Post Error:', error);
    res.status(400).json({ error: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    post.comments.push({
      userId: req.user._id,
      userFullName: req.user.fullName,
      content: req.body.content
    });
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await ForumPost.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
