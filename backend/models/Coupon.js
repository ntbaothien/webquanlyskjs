import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  discountType: {
    type: String,
    enum: ['PERCENT', 'FIXED'],
    default: 'PERCENT'
  },
  discountValue: { type: Number, required: true }, // % or VND amount
  maxUses: { type: Number, default: 0 }, // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 }, // 0 = no cap (for PERCENT)
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }, // null = all events
  validFrom: { type: Date, default: Date.now },
  validTo: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

couponSchema.index({ code: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
