const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const Discount = require('../models/Discount');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// POST /api/discounts/validate — Kiểm tra mã giảm giá
router.post('/validate', auth, async (req, res, next) => {
  try {
    const { code, eventId, totalAmount } = req.body;
    if (!code) return sendBadRequest(res, 'Mã giảm giá là bắt buộc');

    const discount = await Discount.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiredAt: { $gt: new Date() },
      $expr: { $lt: ['$usedCount', '$maxUsage'] },
      $or: [{ eventId: null }, { eventId: eventId || null }],
    });

    if (!discount) return sendBadRequest(res, 'Mã giảm giá không hợp lệ, đã hết hạn hoặc hết lượt dùng');

    let discountAmount = 0;
    if (discount.type === 'percent') {
      discountAmount = ((totalAmount || 0) * discount.value) / 100;
      if (discount.maxDiscountAmount) discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
    } else {
      discountAmount = discount.value;
    }

    sendSuccess(res, {
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount: Math.round(discountAmount),
      remaining: discount.maxUsage - discount.usedCount,
    }, 'Mã giảm giá hợp lệ');
  } catch (err) { next(err); }
});

// POST /api/discounts — Tạo mã (Admin/Organizer)
router.post('/', auth, role('Admin', 'Organizer'), async (req, res, next) => {
  try {
    const { code, type, value, maxUsage, expiredAt, eventId, maxDiscountAmount, minOrderAmount } = req.body;
    if (!code || !type || !value || !maxUsage || !expiredAt) {
      return sendBadRequest(res, 'Thiếu thông tin bắt buộc');
    }
    const discount = await Discount.create({
      code: code.toUpperCase(), type, value, maxUsage, expiredAt,
      eventId: eventId || null, maxDiscountAmount, minOrderAmount,
      createdBy: req.user._id,
    });
    sendCreated(res, discount, 'Tạo mã giảm giá thành công');
  } catch (err) {
    if (err.code === 11000) return sendBadRequest(res, 'Mã giảm giá đã tồn tại');
    next(err);
  }
});

// GET /api/discounts
router.get('/', auth, role('Admin', 'Organizer'), async (req, res, next) => {
  try {
    const discounts = await Discount.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    sendSuccess(res, discounts);
  } catch (err) { next(err); }
});

// PUT /api/discounts/:id
router.put('/:id', auth, role('Admin', 'Organizer'), async (req, res, next) => {
  try {
    const updated = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return sendNotFound(res, 'Mã giảm giá không tồn tại');
    sendSuccess(res, updated, 'Đã cập nhật mã giảm giá');
  } catch (err) { next(err); }
});

// DELETE /api/discounts/:id
router.delete('/:id', auth, role('Admin', 'Organizer'), async (req, res, next) => {
  try {
    await Discount.findByIdAndDelete(req.params.id);
    sendSuccess(res, {}, 'Đã xóa mã giảm giá');
  } catch (err) { next(err); }
});

module.exports = router;
