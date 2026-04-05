import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:    { type: String, required: true },
  userEmail:   { type: String, required: true },
  type:        { type: String, enum: ['TOPUP', 'SPEND', 'REFUND'], required: true },
  amount:      { type: Number, required: true, min: 1 },
  status:      { type: String, enum: ['PENDING', 'COMPLETED', 'REJECTED'], default: 'PENDING' },
  method:      { type: String, default: 'BANK_TRANSFER' },
  note:        { type: String, default: '' },       // user note / booking ref
  adminNote:   { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  // For bank transfer reference
  transferCode: { type: String, default: '' },
}, { timestamps: true });

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
