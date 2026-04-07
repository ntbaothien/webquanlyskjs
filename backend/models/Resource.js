import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // e.g. 'Equipment', 'Venue', 'Staff'
  quantity: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE'],
    default: 'AVAILABLE'
  },
  notes: { type: String }
}, { timestamps: true });

const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;
