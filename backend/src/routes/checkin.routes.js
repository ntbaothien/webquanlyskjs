const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const CheckIn = require('../models/CheckIn');
const Ticket = require('../models/Ticket');
const { verifyTicketQR } = require('../utils/jwtHelper');
const { sendSuccess, sendCreated, sendBadRequest, sendError, sendNotFound } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

// POST /api/checkin/qr — Check-in bằng QR
router.post('/qr', auth, async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return sendBadRequest(res, 'QR token là bắt buộc');

    let decoded;
    try {
      decoded = verifyTicketQR(qrToken);
    } catch {
      return sendBadRequest(res, 'QR code không hợp lệ hoặc đã hết hạn');
    }

    const ticket = await Ticket.findById(decoded.ticketId).populate('eventId', 'title startTime endTime');
    if (!ticket) return sendNotFound(res, 'Vé không tồn tại');
    if (ticket.status !== 'Active') {
      return sendBadRequest(res, `Vé không hợp lệ. Trạng thái: ${ticket.status}`);
    }

    // Kiểm tra đã check-in chưa
    const existing = await CheckIn.findOne({ ticketId: ticket._id });
    if (existing) {
      return sendBadRequest(res, `Vé đã được check-in lúc ${existing.checkedInAt.toLocaleString('vi-VN')}`);
    }

    // Đánh dấu vé đã dùng
    ticket.status = 'Used';
    ticket.checkedInAt = new Date();
    await ticket.save();

    const checkIn = await CheckIn.create({
      ticketId: ticket._id,
      eventId: ticket.eventId._id,
      userId: ticket.userId,
      method: 'QR',
      checkedInBy: req.user._id,
    });

    sendCreated(res, {
      checkIn,
      event: ticket.eventId.title,
      checkedInAt: checkIn.checkedInAt,
    }, '✅ Check-in thành công');
  } catch (err) { next(err); }
});

// POST /api/checkin/offline/sync — Đồng bộ dữ liệu offline
router.post('/offline/sync', auth, async (req, res, next) => {
  try {
    const { records } = req.body; // [{ ticketId, checkedInAt }]
    if (!records?.length) return sendBadRequest(res, 'Không có dữ liệu để sync');

    const results = [];
    for (const rec of records) {
      try {
        const ticket = await Ticket.findById(rec.ticketId);
        if (!ticket || ticket.status !== 'Active') {
          results.push({ ticketId: rec.ticketId, success: false, error: 'Vé không hợp lệ' });
          continue;
        }
        const exists = await CheckIn.findOne({ ticketId: rec.ticketId });
        if (exists) {
          results.push({ ticketId: rec.ticketId, success: false, error: 'Đã check-in' });
          continue;
        }
        await CheckIn.create({
          ticketId: rec.ticketId,
          eventId: ticket.eventId,
          userId: ticket.userId,
          method: 'QR',
          isOffline: true,
          checkedInAt: new Date(rec.checkedInAt),
        });
        await Ticket.findByIdAndUpdate(rec.ticketId, { status: 'Used' });
        results.push({ ticketId: rec.ticketId, success: true });
      } catch (e) {
        results.push({ ticketId: rec.ticketId, success: false, error: e.message });
      }
    }
    sendSuccess(res, { results, synced: results.filter(r => r.success).length });
  } catch (err) { next(err); }
});

// GET /api/events/:eventId/checkins — Lịch sử check-in
router.get('/', auth, role('Organizer', 'Admin'), async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const [checkins, total] = await Promise.all([
      CheckIn.find({ eventId: req.params.eventId })
        .populate('userId', 'fullName email')
        .populate('ticketId', 'ticketTypeId')
        .sort({ checkedInAt: -1 }).skip(skip).limit(limit),
      CheckIn.countDocuments({ eventId: req.params.eventId }),
    ]);
    sendSuccess(res, paginateResponse(checkins, total, page, limit));
  } catch (err) { next(err); }
});

module.exports = router;
