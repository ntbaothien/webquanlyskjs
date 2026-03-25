const mongoose = require('mongoose');
const { Schema } = mongoose;

const seatSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'TicketType',
      default: null,
    },
    seatNumber: {
      type: String,
      required: [true, 'Số ghế là bắt buộc'],
      trim: true,
    },
    row: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Available', 'Held', 'Booked'],
      default: 'Available',
    },
    heldUntil: {
      type: Date,
      default: null,
    },
    heldBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index — tự động giải phóng ghế khi heldUntil hết hạn
// ⚠️ Chỉ hoạt động với documents có heldUntil != null
seatSchema.index({ heldUntil: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { heldUntil: { $type: 'date' } } });
seatSchema.index({ eventId: 1, status: 1 });
seatSchema.index({ eventId: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);
