import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  notified: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure a user can only join the waitlist once per event
waitlistSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const Waitlist = mongoose.model('Waitlist', waitlistSchema);
export default Waitlist;
