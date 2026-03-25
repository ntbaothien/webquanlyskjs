const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề banner là bắt buộc'],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Ảnh banner là bắt buộc'],
    },
    linkUrl: {
      type: String,
      default: null,
    },
    position: {
      type: String,
      enum: ['home_top', 'home_middle', 'sidebar', 'popup', 'footer'],
      default: 'home_top',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: Number,
      default: 0, // Thứ tự hiển thị
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ position: 1, isActive: 1, priority: -1 });

module.exports = mongoose.model('Banner', bannerSchema);
