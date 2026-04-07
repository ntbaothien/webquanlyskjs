import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  question: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  isClosed: { type: Boolean, default: false },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

pollSchema.index({ eventId: 1, createdAt: -1 });

const Poll = mongoose.model('Poll', pollSchema);
export default Poll;
