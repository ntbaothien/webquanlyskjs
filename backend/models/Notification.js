import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['BOOKING', 'REGISTRATION', 'EVENT_UPDATE', 'SYSTEM'],
    default: 'SYSTEM'
  },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '' }
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
