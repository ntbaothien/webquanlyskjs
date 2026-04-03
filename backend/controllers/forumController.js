import ForumPost from '../models/ForumPost.js';
import Event from '../models/Event.js';

// @desc    Get all forum posts for an event
// @route   GET /api/forum/event/:eventId
// @access  Public
export const getForumPostsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const posts = await ForumPost.find({ eventId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy thảo luận' });
  }
};

// @desc    Add a new post to the forum
// @route   POST /api/forum
// @access  Private
export const addForumPost = async (req, res) => {
  try {
    const { eventId, content } = req.body;

    if (!eventId || !content) {
      return res.status(400).json({ error: 'Thiếu thông tin sự kiện hoặc nội dung' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    }

    const post = await ForumPost.create({
      eventId,
      userId: req.user._id,
      userFullName: req.user.fullName,
      content
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi đăng bài' });
  }
};

// @desc    Add a comment to a forum post
// @route   POST /api/forum/:postId/comment
// @access  Private
export const addForumComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;

    if (!content) {
      return res.status(400).json({ error: 'Nội dung bình luận không được để trống' });
    }

    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Bài viết không tồn tại' });
    }

    post.comments.push({
      userId: req.user._id,
      userFullName: req.user.fullName,
      content
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi bình luận' });
  }
};

// @desc    Delete a forum post
// @route   DELETE /api/forum/:id
// @access  Private (Owner or Admin)
export const deleteForumPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Bài viết không tồn tại' });
    }

    // Only owner or admin can delete
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa bài viết này' });
    }

    await post.deleteOne();
    res.json({ message: 'Đã xóa bài viết thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi xóa bài viết' });
  }
};
