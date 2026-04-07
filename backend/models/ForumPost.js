import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userFullName: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

const forumPostSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userFullName: { type: String, required: true },
  content: { type: String, required: true },
  comments: [commentSchema]
}, { timestamps: true });

forumPostSchema.index({ eventId: 1, createdAt: -1 });

const ForumPost = mongoose.model('ForumPost', forumPostSchema);
export default ForumPost;
