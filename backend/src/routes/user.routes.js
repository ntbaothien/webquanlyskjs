const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const User = require('../models/User');
const { sendSuccess, sendError, sendNotFound, sendBadRequest } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users/me
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('savedEvents', 'title startTime images status');
    if (!user) return sendNotFound(res, 'Người dùng không tồn tại');
    sendSuccess(res, user);
  } catch (err) { next(err); }
});

// PUT /api/users/me
router.put('/me', auth, async (req, res, next) => {
  try {
    const { fullName, phone, avatar } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, avatar },
      { new: true, runValidators: true }
    );
    sendSuccess(res, updated, 'Cập nhật thành công');
  } catch (err) { next(err); }
});

// DELETE /api/users/me
router.delete('/me', auth, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    sendSuccess(res, {}, 'Tài khoản đã được xóa');
  } catch (err) { next(err); }
});

// GET /api/users/me/saved
router.get('/me/saved', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedEvents',
      select: 'title startTime endTime location images status category',
    });
    sendSuccess(res, user.savedEvents || []);
  } catch (err) { next(err); }
});

// POST /api/users/me/saved/:eventId
router.post('/me/saved/:eventId', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.savedEvents.includes(req.params.eventId)) {
      return sendBadRequest(res, 'Sự kiện đã được lưu');
    }
    user.savedEvents.push(req.params.eventId);
    await user.save();
    sendSuccess(res, {}, 'Đã lưu sự kiện');
  } catch (err) { next(err); }
});

// DELETE /api/users/me/saved/:eventId
router.delete('/me/saved/:eventId', auth, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { savedEvents: req.params.eventId },
    });
    sendSuccess(res, {}, 'Đã bỏ lưu sự kiện');
  } catch (err) { next(err); }
});

// GET /api/users/me/history (events joined via orders)
router.get('/me/history', auth, async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const { page, limit, skip } = paginate(req.query);
    const [orders, total] = await Promise.all([
      Order.find({ userId: req.user._id, status: 'Paid' })
        .populate('eventId', 'title startTime location images')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ userId: req.user._id, status: 'Paid' }),
    ]);
    sendSuccess(res, paginateResponse(orders, total, page, limit));
  } catch (err) { next(err); }
});

module.exports = router;
