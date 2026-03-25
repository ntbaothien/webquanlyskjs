const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const Event = require('../models/Event');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendBadRequest, sendForbidden } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

// ============================================================
// GET /api/events — Danh sách sự kiện (filter, search, pagination)
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search, category, status, startFrom, startTo, sortBy } = req.query;

    const filter = {};
    if (status) filter.status = status;
    else filter.status = 'Published'; // Mặc định chỉ show Published

    if (category) filter.category = category;
    if (startFrom || startTo) {
      filter.startTime = {};
      if (startFrom) filter.startTime.$gte = new Date(startFrom);
      if (startTo) filter.startTime.$lte = new Date(startTo);
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      soonest: { startTime: 1 },
      popular: { viewCount: -1 },
    };
    const sort = sortOptions[sortBy] || sortOptions.newest;

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('createdBy', 'fullName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Event.countDocuments(filter),
    ]);

    sendSuccess(res, paginateResponse(events, total, page, limit));
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/events/nearby — Tìm sự kiện theo tọa độ
// ============================================================
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius km
    if (!lat || !lng) return sendBadRequest(res, 'Vui lòng cung cấp lat và lng');

    const events = await Event.find({
      status: 'Published',
      geoLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000, // km → m
        },
      },
    }).limit(20).populate('createdBy', 'fullName');

    sendSuccess(res, events);
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/events/:id — Chi tiết sự kiện
// ============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'fullName avatar email');
    if (!event) return sendNotFound(res, 'Sự kiện không tồn tại');

    // Tăng view count
    Event.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

    sendSuccess(res, event);
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/events/:id/tickets-remaining
// ============================================================
router.get('/:id/tickets-remaining', async (req, res, next) => {
  try {
    const TicketType = require('../models/TicketType');
    const types = await TicketType.find({ eventId: req.params.id, isActive: true })
      .select('name quantity sold');
    const data = types.map(t => ({
      _id: t._id,
      name: t.name,
      remaining: t.quantity - t.sold,
      total: t.quantity,
    }));
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/events/:id/share — Metadata chia sẻ
// ============================================================
router.get('/:id/share', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).select('title description images location');
    if (!event) return sendNotFound(res, 'Sự kiện không tồn tại');
    sendSuccess(res, {
      title: event.title,
      description: event.description?.slice(0, 160) || '',
      imageUrl: event.images?.[0] || '',
      inviteUrl: `${process.env.CLIENT_URL}/events/${event._id}`,
      location: event.location,
    });
  } catch (err) { next(err); }
});

// ============================================================
// POST /api/events — Tạo sự kiện (Organizer/Admin)
// ============================================================
router.post('/', auth, role('Organizer', 'Admin'), async (req, res, next) => {
  try {
    const {
      title, description, category, location,
      latitude, longitude, startTime, endTime,
      saleStart, saleEnd, images, language,
    } = req.body;

    if (!title || !category || !startTime || !endTime) {
      return sendBadRequest(res, 'Thiếu thông tin bắt buộc: title, category, startTime, endTime');
    }

    const eventData = {
      title, description, category, location,
      latitude, longitude, startTime, endTime,
      saleStart, saleEnd, images: images || [], language: language || [],
      createdBy: req.user._id,
      status: 'Draft',
    };

    // Set GeoJSON nếu có tọa độ
    if (latitude && longitude) {
      eventData.geoLocation = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    const event = await Event.create(eventData);
    sendCreated(res, event, 'Tạo sự kiện thành công');
  } catch (err) { next(err); }
});

// ============================================================
// PUT /api/events/:id — Cập nhật sự kiện
// ============================================================
router.put('/:id', auth, role('Organizer', 'Admin'), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return sendNotFound(res, 'Sự kiện không tồn tại');

    // Chỉ owner hoặc Admin mới được sửa
    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return sendForbidden(res, 'Bạn không có quyền sửa sự kiện này');
    }

    const updates = { ...req.body };
    if (updates.latitude && updates.longitude) {
      updates.geoLocation = {
        type: 'Point',
        coordinates: [parseFloat(updates.longitude), parseFloat(updates.latitude)],
      };
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    });
    sendSuccess(res, updated, 'Cập nhật sự kiện thành công');
  } catch (err) { next(err); }
});

// ============================================================
// DELETE /api/events/:id — Xóa sự kiện
// ============================================================
router.delete('/:id', auth, role('Organizer', 'Admin'), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return sendNotFound(res, 'Sự kiện không tồn tại');

    if (event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return sendForbidden(res, 'Bạn không có quyền xóa sự kiện này');
    }

    await Event.findByIdAndUpdate(req.params.id, { status: 'Cancelled' });
    sendSuccess(res, {}, 'Sự kiện đã bị hủy');
  } catch (err) { next(err); }
});

module.exports = router;
