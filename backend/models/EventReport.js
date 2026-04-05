import mongoose from 'mongoose';

const eventReportSchema = new mongoose.Schema({
  eventId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventTitle:    { type: String, required: true },
  reporterId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterName:  { type: String, required: true },
  reporterEmail: { type: String, required: true },
  reason: {
    type: String,
    enum: ['SPAM', 'MISLEADING', 'INAPPROPRIATE', 'FRAUD', 'DUPLICATE', 'OTHER'],
    required: true
  },
  description: { type: String, maxlength: 1000, default: '' },
  status: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'DISMISSED'],
    default: 'PENDING'
  },
  adminNote: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

// A user can only report the same event once
eventReportSchema.index({ eventId: 1, reporterId: 1 }, { unique: true });
eventReportSchema.index({ status: 1, createdAt: -1 });

const EventReport = mongoose.model('EventReport', eventReportSchema);
export default EventReport;
