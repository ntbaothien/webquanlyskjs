const mongoose = require('mongoose');
const { Schema } = mongoose;

const campaignSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên chiến dịch là bắt buộc'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['email_blast', 'push', 'sms'],
    },
    targetAudience: {
      type: Schema.Types.Mixed,
      default: {},
      // Ví dụ: { role: 'User', city: 'HCM', category: 'Music' }
    },
    subject: {
      type: String, // Tiêu đề email (nếu type = email_blast)
      default: null,
    },
    content: {
      type: String,
      required: [true, 'Nội dung chiến dịch là bắt buộc'],
    },
    scheduledAt: {
      type: Date,
      default: null, // null = gửi ngay khi kích hoạt
    },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Sent', 'Failed'],
      default: 'Draft',
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

campaignSchema.index({ status: 1, scheduledAt: 1 });
campaignSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
