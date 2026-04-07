import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import Waitlist from '../models/Waitlist.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { paginate } from '../utils/pagination.js';

/**
 * GET /api/organizer/events and /api/organizer/my-events
 * Returns paginated result with content/totalPages matching frontend
 */
export const getMyEvents = async (req, res) => {
  try {
    const { status, page, size } = req.query;
    const filter = { organizerId: req.user._id };
    if (status) filter.status = status;

    const result = await paginate(Event, filter, {
      page, size: size || 20,
      sort: { createdAt: -1 }
    });

    // Add id field for frontend
    result.content = result.content.map(e => ({ ...e, id: e._id }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/organizer/events — create event (multipart)
 */
export const createEvent = async (req, res) => {
  try {
    const { title, description, location, startDate, endDate, maxCapacity, status, tagsInput, isFree, zonesJson } = req.body;

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
    const free = isFree === 'true' || isFree === true;

    let seatZones = [];
    if (!free && zonesJson) {
      try {
        seatZones = JSON.parse(zonesJson);
      } catch { /* ignore */ }
    }

    const category = mapTagToCategory(tags[0]);

    // Nếu Organizer muốn PUBLISHED thì chuyển sang PENDING_APPROVAL (cần Admin duyệt)
    let finalStatus = status || 'DRAFT';
    if (finalStatus === 'PUBLISHED') {
      finalStatus = 'PENDING_APPROVAL';
    }

    const event = await Event.create({
      title,
      description,
      location,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      maxCapacity: parseInt(maxCapacity) || 0,
      status: finalStatus,
      tags,
      category,
      free,
      seatZones,
      organizerId: req.user._id,
      organizerName: req.user.fullName,
      bannerImagePath: req.file ? `/uploads/${req.file.filename}` : ''
    });

    // Thông báo cho organizer về trạng thái
    if (finalStatus === 'PENDING_APPROVAL') {
      await Notification.create({
        userId:   req.user._id,
        title:    'Sự kiện đang chờ phê duyệt',
        message:  `Sự kiện "${event.title}" đã được gửi lên Admin để phê duyệt.`,
        type:     'SYSTEM',
        link:     `/organizer/events`
      });

      // Thông báo cho tất cả Admin
      const admins = await User.find({ role: 'ADMIN' }).select('_id').lean();
      const io = req.app.get('io');
      for (const admin of admins) {
        await Notification.create({
          userId:   admin._id,
          title:    'Sự kiện mới cần phê duyệt',
          message:  `Organizer "${req.user.fullName}" đã gửi sự kiện "${event.title}" để được phê duyệt.`,
          type:     'SYSTEM',
          link:     `/admin/events?status=PENDING_APPROVAL`
        });
        if (io) {
          io.to(`user:${admin._id}`).emit('notification', {
            title:   'Sự kiện mới cần phê duyệt',
            message: `Organizer "${req.user.fullName}" đã gửi "${event.title}"`
          });
        }
      }
    }

    res.status(201).json({
      ...event.toObject(),
      _pendingApproval: finalStatus === 'PENDING_APPROVAL'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/organizer/events/:id
 */
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa sự kiện này' });
    }

    const { title, description, location, startDate, endDate, maxCapacity, status, tagsInput, isFree, zonesJson } = req.body;

    if (title) event.title = title;
    if (description) event.description = description;
    if (location) event.location = location;
    if (startDate) event.startDate = startDate;
    if (endDate) event.endDate = endDate;
    if (maxCapacity !== undefined) event.maxCapacity = parseInt(maxCapacity) || 0;
    if (tagsInput !== undefined) {
      event.tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      event.category = mapTagToCategory(event.tags[0]);
    }
    if (isFree !== undefined) event.free = isFree === 'true' || isFree === true;

    if (!event.free && zonesJson) {
      try {
        event.seatZones = JSON.parse(zonesJson);
      } catch { /* ignore */ }
    }

    if (req.file) {
      event.bannerImagePath = `/uploads/${req.file.filename}`;
    }

    // Nếu Organizer (không phải Admin) cố gắng set status=PUBLISHED → PENDING_APPROVAL
    let pendingApproval = false;
    if (status && req.user.role !== 'ADMIN') {
      if (status === 'PUBLISHED') {
        event.status = 'PENDING_APPROVAL';
        event.rejectionReason = ''; // reset lý do từ chối (nếu đang submit lại)
        pendingApproval = true;
      } else {
        event.status = status;
      }
    } else if (status && req.user.role === 'ADMIN') {
      // Admin có thể set bất kỳ status nào
      event.status = status;
    }

    await event.save();

    if (pendingApproval) {
      await Notification.create({
        userId:  req.user._id,
        title:   'Sự kiện đã gửi phê duyệt',
        message: `Sự kiện "${event.title}" đã được gửi lên Admin để phê duyệt.`,
        type:    'SYSTEM',
        link:    `/organizer/events`
      });
      const admins = await User.find({ role: 'ADMIN' }).select('_id').lean();
      const io = req.app.get('io');
      for (const admin of admins) {
        await Notification.create({
          userId:   admin._id,
          title:    'Sự kiện cần phê duyệt',
          message:  `"${req.user.fullName}" gửi cập nhật sự kiện "${event.title}" để phê duyệt.`,
          type:     'SYSTEM',
          link:     `/admin/events?status=PENDING_APPROVAL`
        });
        if (io) {
          io.to(`user:${admin._id}`).emit('notification', {
            title:   'Sự kiện cần phê duyệt',
            message: `"${req.user.fullName}" gửi cập nhật "${event.title}"`
          });
        }
      }
    }

    res.json({ ...event.toObject(), _pendingApproval: pendingApproval });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/organizer/events/:id
 */
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền xóa sự kiện này' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa sự kiện thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/organizer/events/:id/registrations
 * Query: keyword, status, page, size, tab (registrations|bookings)
 */
export const getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền xem' });
    }

    const { keyword, status, page = 0, size = 20 } = req.query;
    const pageNum = Math.max(0, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(size)));

    // Build filters
    const regFilter = { eventId: req.params.id };
    const bookFilter = { eventId: req.params.id };

    if (keyword) {
      const rx = { $regex: keyword, $options: 'i' };
      regFilter.$or = [{ userFullName: rx }, { userEmail: rx }];
      bookFilter.$or = [{ userFullName: rx }];
    }
    if (status) {
      regFilter.status = status;
      bookFilter.status = status;
    }

    const [
      registrations, regTotal,
      bookings, bookTotal,
      regStats, bookStats
    ] = await Promise.all([
      Registration.find(regFilter).sort({ createdAt: -1 })
        .skip(pageNum * pageSize).limit(pageSize).lean(),
      Registration.countDocuments(regFilter),
      Booking.find(bookFilter).sort({ createdAt: -1 })
        .skip(pageNum * pageSize).limit(pageSize).lean(),
      Booking.countDocuments(bookFilter),
      // Stats for registrations (without keyword/status filter for totals)
      Registration.aggregate([
        { $match: { eventId: event._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Stats for bookings
      Booking.aggregate([
        { $match: { eventId: event._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$totalPrice' },
            seats: { $sum: '$quantity' }
          }
        }
      ])
    ]);

    // Format stats
    const regStatsMap = Object.fromEntries(regStats.map(s => [s._id, s.count]));
    const bookStatsMap = {};
    let totalRevenue = 0, totalSeats = 0;
    bookStats.forEach(s => {
      bookStatsMap[s._id] = s.count;
      if (s._id === 'CONFIRMED') { totalRevenue += s.revenue; totalSeats += s.seats; }
    });

    res.json({
      event,
      registrations: registrations.map(r => ({ ...r, id: r._id })),
      regPagination: {
        total: regTotal,
        totalPages: Math.ceil(regTotal / pageSize),
        page: pageNum,
        size: pageSize
      },
      regStats: {
        total: regStats.reduce((s, x) => s + x.count, 0),
        confirmed: regStatsMap['CONFIRMED'] || 0,
        cancelled: regStatsMap['CANCELLED'] || 0,
      },
      bookings: bookings.map(b => ({ ...b, id: b._id })),
      bookPagination: {
        total: bookTotal,
        totalPages: Math.ceil(bookTotal / pageSize),
        page: pageNum,
        size: pageSize
      },
      bookStats: {
        total: bookStats.reduce((s, x) => s + x.count, 0),
        confirmed: bookStatsMap['CONFIRMED'] || 0,
        cancelled: bookStatsMap['CANCELLED'] || 0,
        totalRevenue,
        totalSeats,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/organizer/events/:id/waitlist
 * Trả về danh sách chờ của sự kiện (chỉ organizer/admin)
 */
export const getEventWaitlist = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền xem' });
    }

    const { keyword, page = 0, size = 20 } = req.query;
    const pageNum = Math.max(0, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(size)));

    const entries = await Waitlist.find({ eventId: req.params.id })
      .populate('userId', 'fullName email')
      .sort({ createdAt: 1 })
      .lean();

    let filtered = entries;
    if (keyword) {
      const lk = keyword.toLowerCase();
      filtered = entries.filter(e =>
        e.userId?.fullName?.toLowerCase().includes(lk) ||
        e.userId?.email?.toLowerCase().includes(lk)
      );
    }

    const total = filtered.length;
    const paged = filtered.slice(pageNum * pageSize, (pageNum + 1) * pageSize);

    res.json({
      event,
      waitlist: paged.map((e, idx) => ({
        _id: e._id,
        position: pageNum * pageSize + idx + 1,
        userId: e.userId?._id,
        userFullName: e.userId?.fullName || 'N/A',
        userEmail: e.userId?.email || 'N/A',
        notified: e.notified,
        createdAt: e.createdAt
      })),
      pagination: {
        total,
        totalPages: Math.ceil(total / pageSize),
        page: pageNum,
        size: pageSize
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper: map tag to category enum
function mapTagToCategory(tag) {
  if (!tag) return 'OTHER';
  const t = tag.toLowerCase();
  const map = {
    'music': 'MUSIC', 'âm nhạc': 'MUSIC', 'nhạc': 'MUSIC', 'concert': 'MUSIC',
    'sports': 'SPORTS', 'thể thao': 'SPORTS',
    'art': 'ART', 'nghệ thuật': 'ART',
    'workshop': 'WORKSHOP',
    'conference': 'CONFERENCE', 'hội thảo': 'CONFERENCE',
    'food': 'FOOD', 'ẩm thực': 'FOOD',
    'community': 'COMMUNITY', 'cộng đồng': 'COMMUNITY'
  };
  return map[t] || 'OTHER';
}
