import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventTitle: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userFullName: { type: String, required: true },
  ticketCode: { type: String, required: true, unique: true },
  zoneName: { type: String, default: 'General' },
  status: {
    type: String,
    enum: ['ACTIVE', 'USED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  eventDate: { type: Date },
  usedAt: { type: Date, default: null }
}, { timestamps: true });

ticketSchema.index({ userId: 1 });
ticketSchema.index({ ticketCode: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
