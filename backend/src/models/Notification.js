const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'event_reminder',
        'order_success',
        'order_cancelled',
        'ticket_transfer',
        'payment_success',
        'payment_failed',
        'checkin_success',
        'new_event',
        'system',
      ],
      default: 'system',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Link điều hướng khi click notification
    actionUrl: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed, // { eventId, orderId, ticketId, ... }
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
