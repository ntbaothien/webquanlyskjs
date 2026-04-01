import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userFullName: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventTitle: { type: String, required: true },
  zoneId: { type: String, required: true },
  zoneName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  pricePerSeat: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'],
    default: 'CONFIRMED'
  }
}, { timestamps: true });

bookingSchema.index({ userId: 1 });
bookingSchema.index({ eventId: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
