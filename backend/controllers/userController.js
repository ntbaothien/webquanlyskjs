import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';

/**
 * GET /api/users/me
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFA');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/users/me — update profile
 */
export const updateMe = async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (req.file) {
      updates.avatarUrl = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select('-password -twoFA');

    // Return format frontend expects: { data: user }
    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/users/me/password
 */
export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/users/me/stats
 */
export const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [registrations, bookings, eventsCreated, reviews, user] = await Promise.all([
      Registration.countDocuments({ userId }),
      Booking.countDocuments({ userId }),
      Event.countDocuments({ organizerId: userId }),
      Review.countDocuments({ userId }),
      User.findById(userId).select('balance').lean()
    ]);

    res.json({
      registrations,
      bookings,
      eventsCreated,
      reviews,
      balance: user?.balance || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/users/me/saved
 */
export const getMySaved = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedEvents');
    res.json({ data: user.savedEvents || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/users/me/saved/:eventId — toggle save
 */
export const toggleSaveEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });

    const user = await User.findById(req.user._id);
    const index = user.savedEvents.findIndex(id => id.toString() === eventId);

    if (index > -1) {
      user.savedEvents.splice(index, 1);
      await user.save();
      res.json({ saved: false, message: 'Đã bỏ lưu sự kiện' });
    } else {
      user.savedEvents.push(eventId);
      await user.save();
      res.json({ saved: true, message: 'Đã lưu sự kiện' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/users/me/saved/:eventId — unsave
 */
export const unsaveEvent = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedEvents: req.params.eventId }
    });
    res.json({ message: 'Đã bỏ lưu sự kiện' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/users/me/topup — request a top-up
 * Body: { amount, method?, note? }
 */
export const requestTopup = async (req, res) => {
  try {
    const { amount, method = 'BANK_TRANSFER', note = '' } = req.body;
    const amt = Number(amount);

    if (!amt || amt < 10000) {
      return res.status(400).json({ error: 'Số tiền nạp tối thiểu là 10,000đ' });
    }
    if (amt > 50000000) {
      return res.status(400).json({ error: 'Số tiền nạp tối đa là 50,000,000đ' });
    }

    // Generate a short unique transfer code
    const transferCode = `EH${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const transaction = await Transaction.create({
      userId:       req.user._id,
      userName:     req.user.fullName,
      userEmail:    req.user.email,
      type:         'TOPUP',
      amount:       amt,
      status:       'PENDING',
      method,
      note,
      transferCode,
    });

    res.status(201).json({ message: 'Yêu cầu nạp tiền đã được tạo. Vui lòng chuyển khoản và chờ xác nhận.', transaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/users/me/transactions — transaction history
 * Query: page, size, type, status
 */
export const getMyTransactions = async (req, res) => {
  try {
    const { page = 0, size = 10, type, status } = req.query;
    const pageNum  = Math.max(0, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));

    const filter = { userId: req.user._id };
    if (type)   filter.type   = type;
    if (status) filter.status = status;

    const [transactions, total, user] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(pageNum * pageSize)
        .limit(pageSize)
        .lean(),
      Transaction.countDocuments(filter),
      User.findById(req.user._id).select('balance').lean()
    ]);

    res.json({
      content: transactions,
      totalPages: Math.ceil(total / pageSize),
      totalElements: total,
      page: pageNum,
      size: pageSize,
      balance: user?.balance || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ==============================
 * GAMIFICATION — Loyalty Points
 * ==============================
 */

// Tier thresholds
const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 200,
  GOLD: 500,
  PLATINUM: 1000
};

// Points per action
const POINT_VALUES = {
  BUY_TICKET: 50,
  LEAVE_REVIEW: 10,
  DAILY_LOGIN: 5,
  REGISTER_FREE_EVENT: 5,
  BUY_RESELL_TICKET: 20,
  SHARE_EVENT: 3
};

/**
 * Hàm utility: Cộng điểm cho user và cập nhật tier
 * @param {ObjectId|String} userId
 * @param {String} action - key từ POINT_VALUES
 * @param {String} description - mô tả hành động
 */
export const rewardPoints = async (userId, action, description = '') => {
  const points = POINT_VALUES[action] || 0;
  if (points === 0) return null;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $inc: { loyaltyPoints: points },
      $push: {
        pointHistory: {
          action,
          points,
          description: description || action,
          earnedAt: new Date()
        }
      }
    },
    { new: true }
  );

  if (!user) return null;

  // Cập nhật tier
  let newTier = 'BRONZE';
  if (user.loyaltyPoints >= TIER_THRESHOLDS.PLATINUM) newTier = 'PLATINUM';
  else if (user.loyaltyPoints >= TIER_THRESHOLDS.GOLD) newTier = 'GOLD';
  else if (user.loyaltyPoints >= TIER_THRESHOLDS.SILVER) newTier = 'SILVER';

  if (newTier !== user.loyaltyTier) {
    await User.findByIdAndUpdate(userId, { loyaltyTier: newTier });

    // Tặng badge khi lên hạng
    const tierBadge = `TIER_${newTier}`;
    if (!user.badges.includes(tierBadge)) {
      await User.findByIdAndUpdate(userId, { $addToSet: { badges: tierBadge } });
    }
  }

  return { points, newTotal: user.loyaltyPoints, tier: newTier };
};

/**
 * GET /api/users/me/loyalty — Xem thông tin điểm thưởng
 */
export const getLoyaltyInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('loyaltyPoints loyaltyTier badges pointHistory fullName avatarUrl')
      .lean();

    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    // Tính điểm cần để lên tier tiếp theo
    const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const currentTierIndex = tiers.indexOf(user.loyaltyTier);
    const nextTier = tiers[currentTierIndex + 1] || null;
    const nextTierThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
    const pointsToNextTier = nextTierThreshold ? Math.max(0, nextTierThreshold - user.loyaltyPoints) : 0;

    // Lấy 20 điểm gần nhất
    const recentHistory = (user.pointHistory || [])
      .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
      .slice(0, 20);

    // Benefits theo tier
    const tierBenefits = {
      BRONZE: ['Tích điểm cơ bản'],
      SILVER: ['Tích điểm cơ bản', 'Ưu tiên hàng đầu trong danh sách chờ'],
      GOLD: ['Tích điểm x1.5', 'Ưu tiên hàng đầu', 'Giảm 5% phí giao dịch chợ vé'],
      PLATINUM: ['Tích điểm x2', 'VIP Priority', 'Giảm 10% phí giao dịch chợ vé', 'Hỗ trợ ưu tiên 24/7']
    };

    res.json({
      loyaltyPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
      badges: user.badges || [],
      nextTier,
      nextTierThreshold,
      pointsToNextTier,
      currentTierProgress: nextTierThreshold
        ? Math.round(((user.loyaltyPoints - TIER_THRESHOLDS[user.loyaltyTier]) / (nextTierThreshold - TIER_THRESHOLDS[user.loyaltyTier])) * 100)
        : 100,
      benefits: tierBenefits[user.loyaltyTier] || [],
      recentHistory,
      thresholds: TIER_THRESHOLDS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
