import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['ATTENDEE', 'ORGANIZER', 'ADMIN'],
    default: 'ATTENDEE'
  },
  balance: { type: Number, default: 0 },
  phone: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  isLocked: { type: Boolean, default: false },
  savedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  twoFA: {
    enabled: { type: Boolean, default: false },
    secret: { type: String, default: '' }
  }
}, { timestamps: true });

// Do NOT return password in JSON
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFA;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
