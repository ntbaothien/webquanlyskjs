import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'DELIVERED', 'RETURNED'],
    default: 'PENDING'
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index for faster lookups
resourceSchema.index({ eventId: 1 });

const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;
