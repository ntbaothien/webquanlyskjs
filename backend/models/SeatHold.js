import mongoose from 'mongoose';

const seatHoldSchema = new mongoose.Schema({
  eventId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  zoneId:    { type: String, required: true }, // sub-doc _id của seatZone
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity:  { type: Number, required: true, min: 1 },
  expiresAt: { type: Date, required: true },     // thời điểm hết hạn giữ chỗ

  // === Group Buying ===
  isGroupBuying: { type: Boolean, default: false },
  groupInviteCode: { type: String, default: null }, // mã mời bạn bè
  members: [{
    email: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    amount: { type: Number, default: 0 },   // số tiền phải trả
    isPaid: { type: Boolean, default: false }
  }]
}, { timestamps: true });

// TTL index: MongoDB tự dọn sau expiresAt
// (độ trễ dọn ~60s, nhưng code logic tự kiểm tra expiresAt > now)
seatHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index để query nhanh khi tính ghế còn trống
seatHoldSchema.index({ eventId: 1, zoneId: 1 });
seatHoldSchema.index({ userId: 1 });
seatHoldSchema.index({ groupInviteCode: 1 });

const SeatHold = mongoose.model('SeatHold', seatHoldSchema);
export default SeatHold;
