const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating là bắt buộc'],
      min: [1, 'Rating tối thiểu là 1'],
      max: [5, 'Rating tối đa là 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bình luận không quá 1000 ký tự'],
    },
    images: [{ type: String }],
    likes: {
      type: Number,
      default: 0,
    },
    isVerifiedAttendee: {
      type: Boolean,
      default: false, // True nếu userId đã check-in event này
    },
  },
  {
    timestamps: true,
  }
);

// Mỗi user chỉ review 1 lần cho 1 event
reviewSchema.index({ eventId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ eventId: 1, rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
