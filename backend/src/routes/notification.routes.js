const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const Notification = require('../models/Notification');
const { sendSuccess, sendNotFound } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

// GET /api/notifications
router.get('/', auth, async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [items, total] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId: req.user._id }),
    ]);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    sendSuccess(res, { ...paginateResponse(items, total, page, limit), unreadCount });
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true }, { new: true }
    );
    if (!notif) return sendNotFound(res, 'Thông báo không tồn tại');
    sendSuccess(res, notif, 'Đã đọc thông báo');
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    sendSuccess(res, {}, 'Đã đọc tất cả thông báo');
  } catch (err) { next(err); }
});

module.exports = router;
