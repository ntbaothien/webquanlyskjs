const mongoose = require('mongoose');
const { Schema } = mongoose;

const checkInSchema = new Schema(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['QR', 'Manual'],
      default: 'QR',
    },
    isOffline: {
      type: Boolean,
      default: false,
    },
    // ID thiết bị kiểm tra vé
    deviceId: {
      type: String,
      default: null,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

checkInSchema.index({ eventId: 1, checkedInAt: -1 });
checkInSchema.index({ ticketId: 1 }, { unique: true }); // mỗi vé chỉ check-in 1 lần
checkInSchema.index({ userId: 1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
