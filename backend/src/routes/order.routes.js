const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const Order = require('../models/Order');
const TicketType = require('../models/TicketType');
const Seat = require('../models/Seat');
const Discount = require('../models/Discount');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendError } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

// ============================================================
// POST /api/orders — Tạo đơn hàng
// ============================================================
router.post('/', auth, async (req, res, next) => {
  try {
    const { eventId, items, discountCode, seatIds } = req.body;
    // items: [{ ticketTypeId, quantity }]

    if (!eventId || !items?.length) {
      return sendBadRequest(res, 'eventId và items là bắt buộc');
    }

    // Validate & tính tiền
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const type = await TicketType.findOne({ _id: item.ticketTypeId, eventId, isActive: true });
      if (!type) return sendBadRequest(res, `Loại vé không tồn tại`);

      const remaining = type.quantity - type.sold;
      if (remaining < item.quantity) {
        return sendBadRequest(res, `Loại vé "${type.name}" còn lại ${remaining} vé`);
      }

      validatedItems.push({ ticketTypeId: type._id, quantity: item.quantity, unitPrice: type.price });
      totalAmount += type.price * item.quantity;
    }

    // Validate mã giảm giá
    let discountAmount = 0;
    if (discountCode) {
      const discount = await Discount.findOne({
        code: discountCode.toUpperCase(),
        isActive: true,
        expiredAt: { $gt: new Date() },
        $expr: { $lt: ['$usedCount', '$maxUsage'] },
        $or: [{ eventId: null }, { eventId }],
      });
      if (!discount) return sendBadRequest(res, 'Mã giảm giá không hợp lệ hoặc đã hết lượt dùng');

      if (discount.type === 'percent') {
        discountAmount = (totalAmount * discount.value) / 100;
        if (discount.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
        }
      } else {
        discountAmount = discount.value;
      }
      // Tăng usedCount
      await Discount.findByIdAndUpdate(discount._id, { $inc: { usedCount: 1 } });
    }

    const finalAmount = Math.max(0, totalAmount - discountAmount);

    const order = await Order.create({
      userId: req.user._id,
      eventId,
      items: validatedItems,
      totalAmount,
      discountCode: discountCode || null,
      discountAmount,
      finalAmount,
      status: 'Pending',
    });

    // Tạm lock số lượng vé
    for (const item of validatedItems) {
      await TicketType.findByIdAndUpdate(item.ticketTypeId, { $inc: { sold: item.quantity } });
    }

    sendCreated(res, order, 'Đơn hàng đã được tạo. Vui lòng thanh toán trong 15 phút');
  } catch (err) { next(err); }
});

// GET /api/orders — Danh sách đơn của user
router.get('/', auth, async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [orders, total] = await Promise.all([
      Order.find({ userId: req.user._id })
        .populate('eventId', 'title startTime images location')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ userId: req.user._id }),
    ]);
    sendSuccess(res, paginateResponse(orders, total, page, limit));
  } catch (err) { next(err); }
});

// GET /api/orders/:id — Chi tiết đơn
router.get('/:id', auth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('eventId', 'title startTime endTime location images')
      .populate('items.ticketTypeId', 'name price');
    if (!order) return sendNotFound(res, 'Đơn hàng không tồn tại');
    sendSuccess(res, order);
  } catch (err) { next(err); }
});

// PUT /api/orders/:id/cancel — Hủy đơn
router.put('/:id/cancel', auth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return sendNotFound(res, 'Đơn hàng không tồn tại');
    if (order.status !== 'Pending') {
      return sendBadRequest(res, 'Chỉ có thể hủy đơn hàng đang chờ thanh toán');
    }
    // Hoàn lại số lượng vé
    for (const item of order.items) {
      await TicketType.findByIdAndUpdate(item.ticketTypeId, { $inc: { sold: -item.quantity } });
    }
    order.status = 'Cancelled';
    await order.save();
    sendSuccess(res, order, 'Đã hủy đơn hàng');
  } catch (err) { next(err); }
});

// POST /api/orders/:id/refund — Yêu cầu hoàn tiền
router.post('/:id/refund', auth, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return sendNotFound(res, 'Đơn hàng không tồn tại');
    if (order.status !== 'Paid') {
      return sendBadRequest(res, 'Chỉ có thể hoàn tiền đơn hàng đã thanh toán');
    }
    order.status = 'Refunded';
    await order.save();
    // TODO: Gọi payment gateway refund API
    sendSuccess(res, order, 'Yêu cầu hoàn tiền đã được ghi nhận');
  } catch (err) { next(err); }
});

module.exports = router;
