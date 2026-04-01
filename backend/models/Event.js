import mongoose from 'mongoose';

const seatZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#6c63ff' },
  totalSeats: { type: Number, required: true },
  soldSeats: { type: Number, default: 0 },
  price: { type: Number, default: 0 }
}, { _id: true });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  location: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  maxCapacity: { type: Number, default: 0 }, // 0 = unlimited
  currentAttendees: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
    default: 'DRAFT'
  },
  tags: [{ type: String }],
  category: {
    type: String,
    enum: ['MUSIC', 'SPORTS', 'ART', 'WORKSHOP', 'CONFERENCE', 'FOOD', 'COMMUNITY', 'OTHER'],
    default: 'OTHER'
  },
  bannerImagePath: { type: String, default: '' },
  free: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerName: { type: String, default: '' },
  seatZones: [seatZoneSchema]
}, { timestamps: true });

// Text index for search
eventSchema.index({ title: 'text', description: 'text', location: 'text' });
eventSchema.index({ tags: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ organizerId: 1 });

const Event = mongoose.model('Event', eventSchema);
export default Event;
