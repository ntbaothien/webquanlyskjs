const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'TicketType',
      required: true,
    },
    seatId: {
      type: Schema.Types.ObjectId,
      ref: 'Seat',
      default: null,
    },
    qrCode: {
      type: String, // JWT signed string
      required: true,
    },
    qrCodeUrl: {
      type: String, // URL ảnh QR
    },
    status: {
      type: String,
      enum: ['Active', 'Used', 'Transferred', 'Cancelled'],
      default: 'Active',
    },
    transferredTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ userId: 1, status: 1 });
ticketSchema.index({ orderId: 1 });
ticketSchema.index({ eventId: 1 });
ticketSchema.index({ qrCode: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);
