const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const TicketType = require('../models/TicketType');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendError } = require('../utils/response');

// POST /api/payments/checkout — Khởi tạo thanh toán
router.post('/checkout', auth, async (req, res, next) => {
  try {
    const { orderId, method } = req.body;
    if (!orderId || !method) return sendBadRequest(res, 'orderId và method là bắt buộc');

    const order = await Order.findOne({ _id: orderId, userId: req.user._id, status: 'Pending' });
    if (!order) return sendNotFound(res, 'Đơn hàng không tồn tại hoặc đã hết hạn');

    const payment = await Payment.create({
      orderId: order._id,
      userId: req.user._id,
      method,
      amount: order.finalAmount,
      status: 'Pending',
    });

    // Mô phỏng thanh toán thành công (thực tế sẽ gọi VNPay/Momo API và return redirect URL)
    // Để tích hợp VNPay thật: trả về { paymentUrl } để frontend redirect
    sendCreated(res, {
      paymentId: payment._id,
      orderId: order._id,
      amount: order.finalAmount,
      method,
      // paymentUrl: 'https://sandbox.vnpayment.vn/...' (khi tích hợp thật)
      note: 'Gọi POST /api/payments/webhook để mô phỏng thanh toán thành công',
    }, 'Đã khởi tạo thanh toán');
  } catch (err) { next(err); }
});

// POST /api/payments/webhook — Webhook cổng thanh toán
router.post('/webhook', async (req, res, next) => {
  try {
    const { paymentId, transactionId, status } = req.body;
    // Thực tế: verify chữ ký HMAC từ VNPay trước khi xử lý

    const payment = await Payment.findById(paymentId);
    if (!payment) return sendNotFound(res, 'Payment không tồn tại');

    payment.transactionId = transactionId || `TXN_${Date.now()}`;
    payment.status = status === 'success' ? 'Success' : 'Failed';
    payment.paidAt = status === 'success' ? new Date() : null;
    await payment.save();

    if (payment.status === 'Success') {
      // Cập nhật order → Paid
      await Order.findByIdAndUpdate(payment.orderId, { status: 'Paid', expiresAt: null });

      // Sinh vé điện tử
      const { createTicketsForOrder } = require('./ticket.routes');
      await createTicketsForOrder(payment.orderId);

      // TODO: Gửi email xác nhận vé
    } else {
      // Thanh toán thất bại → hoàn vé trở lại
      const order = await Order.findById(payment.orderId);
      if (order) {
        for (const item of order.items) {
          await TicketType.findByIdAndUpdate(item.ticketTypeId, { $inc: { sold: -item.quantity } });
        }
        await Order.findByIdAndUpdate(payment.orderId, { status: 'Cancelled' });
      }
    }

    sendSuccess(res, { status: payment.status }, 'Webhook đã xử lý');
  } catch (err) { next(err); }
});

// GET /api/payments/:orderId — Trạng thái thanh toán
router.get('/:orderId', auth, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId, userId: req.user._id });
    if (!payment) return sendNotFound(res, 'Không tìm thấy payment cho đơn hàng này');
    sendSuccess(res, payment);
  } catch (err) { next(err); }
});

module.exports = router;
