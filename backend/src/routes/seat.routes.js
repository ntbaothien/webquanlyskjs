const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middlewares/auth.middleware');
const Seat = require('../models/Seat');
const { sendSuccess, sendNotFound, sendBadRequest, sendError } = require('../utils/response');

// GET /api/events/:eventId/seats — Sơ đồ chỗ ngồi
router.get('/', async (req, res, next) => {
  try {
    const seats = await Seat.find({ eventId: req.params.eventId }).sort({ row: 1, seatNumber: 1 });
    sendSuccess(res, seats);
  } catch (err) { next(err); }
});

// POST /api/seats/:seatId/hold — Giữ chỗ 10 phút
router.post('/:seatId/hold', auth, async (req, res, next) => {
  try {
    const seat = await Seat.findById(req.params.seatId);
    if (!seat) return sendNotFound(res, 'Ghế không tồn tại');

    if (seat.status === 'Booked') {
      return sendBadRequest(res, 'Ghế này đã được đặt');
    }
    if (seat.status === 'Held' && seat.heldUntil > new Date()) {
      return sendBadRequest(res, 'Ghế đang được giữ bởi người khác');
    }

    const heldUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    const updated = await Seat.findByIdAndUpdate(
      req.params.seatId,
      { status: 'Held', heldUntil, heldBy: req.user._id },
      { new: true }
    );
    sendSuccess(res, { seat: updated, heldUntil }, 'Giữ chỗ thành công (10 phút)');
  } catch (err) { next(err); }
});

// DELETE /api/seats/:seatId/hold — Hủy giữ chỗ
router.delete('/:seatId/hold', auth, async (req, res, next) => {
  try {
    const seat = await Seat.findById(req.params.seatId);
    if (!seat) return sendNotFound(res, 'Ghế không tồn tại');

    if (seat.heldBy?.toString() !== req.user._id.toString()) {
      return sendError(res, 'Bạn không giữ ghế này', 403);
    }

    await Seat.findByIdAndUpdate(req.params.seatId, {
      status: 'Available', heldUntil: null, heldBy: null,
    });
    sendSuccess(res, {}, 'Đã hủy giữ chỗ');
  } catch (err) { next(err); }
});

module.exports = router;
