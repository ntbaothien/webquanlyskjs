import ChatMessage from '../models/ChatMessage.js';

/**
 * GET /api/chat/history — get last 50 messages
 */
export const getChatHistory = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ roomId: 'support' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
