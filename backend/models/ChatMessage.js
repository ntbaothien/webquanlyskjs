import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  roomId:     { type: String, default: 'support' },
  senderId:   { type: String, default: 'unknown' },
  senderName: { type: String, default: 'Anonymous' },
  senderRole: { type: String, default: 'ATTENDEE' },
  message:    { type: String, required: true, maxlength: 1000 },
  isBot:      { type: Boolean, default: false }
}, { timestamps: true });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
