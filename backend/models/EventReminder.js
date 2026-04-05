import mongoose from 'mongoose';

const eventReminderSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  attendeeEmail: { type: String, required: true },
  attendeeFullName: { type: String, default: '' },
  reminderType: {
    type: String,
    enum: ['24h', '1h', 'booking-confirmation', 'day-of', 'manual'],
    default: '24h'
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'pending'
  },
  sentAt: { type: Date, default: null },
  failureReason: { type: String, default: '' },
  emailId: { type: String, default: '' } // For tracking purpose (Nodemailer info)
}, { timestamps: true });

// Indexes for quick lookup
eventReminderSchema.index({ eventId: 1, reminderType: 1 });
eventReminderSchema.index({ attendeeEmail: 1 });
eventReminderSchema.index({ sentAt: 1 });
eventReminderSchema.index({ status: 1 });

const EventReminder = mongoose.model('EventReminder', eventReminderSchema);
export default EventReminder;
