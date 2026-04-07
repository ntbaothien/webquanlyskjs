import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'BALANCE' },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL_PAID', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  couponCode: { type: String, default: '' },
  discount: { type: Number, default: 0 },

  // === Group Buying ===
  splitType: {
    type: String,
    enum: ['SINGLE', 'GROUP'],
    default: 'SINGLE'
  },
  seatHoldId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeatHold', default: null }
}, { timestamps: true });

orderSchema.index({ userId: 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
