const mongoose = require('mongoose');
const { Schema } = mongoose;

const userOTPSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiredAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index — MongoDB tự xóa document sau khi expiredAt
userOTPSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });
userOTPSchema.index({ userId: 1 });

module.exports = mongoose.model('UserOTP', userOTPSchema);
