import mongoose from 'mongoose';

const resellListingSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    unique: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  eventTitle: { type: String, required: true },
  zoneName: { type: String, default: 'General' },
  eventDate: { type: Date },
  listingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: { type: Number, default: 0 },
  platformFeePercent: { type: Number, default: 5 },  // phí nền tảng 5%
  status: {
    type: String,
    enum: ['ACTIVE', 'SOLD', 'CANCELLED'],
    default: 'ACTIVE'
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  soldAt: { type: Date, default: null }
}, { timestamps: true });

resellListingSchema.index({ status: 1, eventId: 1 });
resellListingSchema.index({ sellerId: 1 });
resellListingSchema.index({ ticketId: 1 }, { unique: true });

const ResellListing = mongoose.model('ResellListing', resellListingSchema);
export default ResellListing;
