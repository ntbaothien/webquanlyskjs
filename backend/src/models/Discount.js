const mongoose = require('mongoose');
const { Schema } = mongoose;

const discountSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, 'Mã giảm giá là bắt buộc'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['percent', 'fixed'],
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number, // Giới hạn max khi type = percent
      default: null,
    },
    maxUsage: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    // null = áp dụng toàn hệ thống
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },
    expiredAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

discountSchema.index({ eventId: 1, isActive: 1 });
discountSchema.index({ expiredAt: 1 });

module.exports = mongoose.model('Discount', discountSchema);
