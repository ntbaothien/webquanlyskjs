import ChatMessage from '../models/ChatMessage.js';

/**
 * GET /api/chat/history — get last 50 messages for the current user's room only
 */
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Each user has their own private chat room: chat:user:{userId}
    const roomId = `user:${userId}`;

    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
