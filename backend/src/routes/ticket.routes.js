const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const qrcode = require('qrcode');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const TicketType = require('../models/TicketType');
const { generateTicketQR, verifyTicketQR } = require('../utils/jwtHelper');
const { sendSuccess, sendNotFound, sendBadRequest, sendError } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

// Hàm nội bộ: tạo vé sau khi thanh toán thành công
const createTicketsForOrder = async (orderId) => {
  const order = await Order.findById(orderId).populate('items.ticketTypeId');
  const tickets = [];
  for (const item of order.items) {
    for (let i = 0; i < item.quantity; i++) {
      const ticket = new Ticket({
        orderId: order._id,
        userId: order.userId,
        eventId: order.eventId,
        ticketTypeId: item.ticketTypeId._id,
        qrCode: '',
        status: 'Active',
      });
      const qrPayload = generateTicketQR(ticket._id.toString());
      ticket.qrCode = qrPayload;
      // Tạo ảnh QR base64
      ticket.qrCodeUrl = await qrcode.toDataURL(qrPayload);
      tickets.push(ticket);
    }
  }
  await Ticket.insertMany(tickets);
  return tickets;
};

// GET /api/tickets/me — Vé của tôi
router.get('/me', auth, async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [tickets, total] = await Promise.all([
      Ticket.find({ userId: req.user._id })
        .populate('eventId', 'title startTime location images')
        .populate('ticketTypeId', 'name price')
        .populate('seatId', 'seatNumber row section')
        .sort({ issuedAt: -1 }).skip(skip).limit(limit),
      Ticket.countDocuments({ userId: req.user._id }),
    ]);
    sendSuccess(res, paginateResponse(tickets, total, page, limit));
  } catch (err) { next(err); }
});

// GET /api/tickets/:id/qr — Lấy QR code vé
router.get('/:id/qr', auth, async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return sendNotFound(res, 'Vé không tồn tại');
    if (ticket.status !== 'Active') {
      return sendBadRequest(res, `Vé có trạng thái: ${ticket.status}, không thể dùng`);
    }
    sendSuccess(res, { qrCode: ticket.qrCode, qrCodeUrl: ticket.qrCodeUrl });
  } catch (err) { next(err); }
});

// POST /api/tickets/:id/transfer — Chuyển nhượng vé
router.post('/:id/transfer', auth, async (req, res, next) => {
  try {
    const { toEmail } = req.body;
    if (!toEmail) return sendBadRequest(res, 'Email người nhận là bắt buộc');

    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return sendNotFound(res, 'Vé không tồn tại');
    if (ticket.status !== 'Active') {
      return sendBadRequest(res, 'Chỉ có thể chuyển nhượng vé Active');
    }

    const User = require('../models/User');
    const recipient = await User.findOne({ email: toEmail.toLowerCase() });
    if (!recipient) return sendBadRequest(res, 'Người dùng với email này không tồn tại');
    if (recipient._id.toString() === req.user._id.toString()) {
      return sendBadRequest(res, 'Không thể chuyển vé cho chính mình');
    }

    ticket.status = 'Transferred';
    ticket.transferredTo = recipient._id;
    await ticket.save();

    // Tạo vé mới cho người nhận
    const newTicket = await Ticket.create({
      orderId: ticket.orderId,
      userId: recipient._id,
      eventId: ticket.eventId,
      ticketTypeId: ticket.ticketTypeId,
      seatId: ticket.seatId,
      qrCode: generateTicketQR(new Date().getTime().toString()),
      status: 'Active',
    });
    newTicket.qrCodeUrl = await qrcode.toDataURL(newTicket.qrCode);
    await newTicket.save();

    sendSuccess(res, {}, `Đã chuyển vé cho ${toEmail}`);
  } catch (err) { next(err); }
});

module.exports = { router, createTicketsForOrder };
