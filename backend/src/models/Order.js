const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'TicketType',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
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
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountCode: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Cancelled', 'Refunded'],
      default: 'Pending',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 phút
    },
    note: { type: String },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ eventId: 1 });
orderSchema.index({ createdAt: -1 });
// TTL: tự hủy đơn Pending sau 15 phút nếu chưa thanh toán
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'Pending' } });

module.exports = mongoose.model('Order', orderSchema);
