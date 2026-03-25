const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams để lấy :eventId từ parent
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const TicketType = require('../models/TicketType');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// GET /api/events/:eventId/ticket-types
router.get('/', async (req, res, next) => {
  try {
    const types = await TicketType.find({ eventId: req.params.eventId, isActive: true });
    sendSuccess(res, types);
  } catch (err) { next(err); }
});

// POST /api/events/:eventId/ticket-types
router.post('/', auth, role('Organizer', 'Admin'), async (req, res, next) => {
  try {
    const { name, price, quantity, description, isGroupTicket, groupSize } = req.body;
    if (!name || price === undefined || !quantity) {
      return sendBadRequest(res, 'name, price, quantity là bắt buộc');
    }
    const ticketType = await TicketType.create({
      eventId: req.params.eventId,
      name, price, quantity, description,
      isGroupTicket: isGroupTicket || false,
      groupSize: groupSize || 1,
    });
    sendCreated(res, ticketType, 'Tạo loại vé thành công');
  } catch (err) { next(err); }
});

// PUT /api/ticket-types/:id (standalone route)
router.put('/:id', auth, role('Organizer', 'Admin'), async (req, res, next) => {
  try {
    const { name, price, quantity, description, isActive } = req.body;
    const updated = await TicketType.findByIdAndUpdate(
      req.params.id,
      { name, price, quantity, description, isActive },
      { new: true, runValidators: true }
    );
    if (!updated) return sendNotFound(res, 'Loại vé không tồn tại');
    sendSuccess(res, updated, 'Cập nhật loại vé thành công');
  } catch (err) { next(err); }
});

// DELETE /api/ticket-types/:id (standalone route)
router.delete('/:id', auth, role('Organizer', 'Admin'), async (req, res, next) => {
  try {
    const ticketType = await TicketType.findById(req.params.id);
    if (!ticketType) return sendNotFound(res, 'Loại vé không tồn tại');
    if (ticketType.sold > 0) {
      return sendBadRequest(res, 'Không thể xóa loại vé đã có người mua');
    }
    await TicketType.findByIdAndDelete(req.params.id);
    sendSuccess(res, {}, 'Đã xóa loại vé');
  } catch (err) { next(err); }
});

module.exports = router;
