import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import EventReport from '../models/EventReport.js';
import Waitlist from '../models/Waitlist.js';
import SeatHold from '../models/SeatHold.js';
import { paginate } from '../utils/pagination.js';
import { generateTicketCode } from '../utils/generateTicketCode.js';

/**
 * GET /api/events — paginated, filterable
 * Query params:
 *   keyword, tag, location, dateFrom, dateTo  — existing
 *   free        : 'true' | 'false'            — filter free/paid
 *   priceMax    : number                       — max ticket price (paid events)
 *   sort        : date_asc | date_desc | popular | newest
 *   timeStatus  : upcoming | ongoing | past
 *   organizer   : string                       — search by organizer name
 */
export const getEvents = async (req, res) => {
  try {
    const {
      keyword, tag, location, dateFrom, dateTo,
      free, priceMax, sort, timeStatus, organizer,
      page, size
    } = req.query;

    const filter = { status: 'PUBLISHED' };
    const now = new Date();

    // Keyword: title, description, tags, organizer
    if (keyword) {
      const rx = { $regex: keyword, $options: 'i' };
      filter.$or = [
        { title: rx },
        { description: rx },
        { tags: rx },
        { organizerName: rx }
      ];
    }

    // Organizer search (separate field)
    if (organizer) {
      filter.organizerName = { $regex: organizer, $options: 'i' };
    }

    // Tag exact match (case-insensitive)
    if (tag) {
      filter.tags = { $regex: new RegExp(`^${tag}$`, 'i') };
    }

    // Location
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    // Date range (explicit dateFrom/dateTo)
    if (dateFrom || dateTo) {
      filter.startDate = {};
      if (dateFrom) filter.startDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.startDate.$lte = end;
      }
    }

    // Time status (overrides dateFrom/dateTo if provided)
    if (timeStatus === 'upcoming') {
      filter.startDate = { $gt: now };
    } else if (timeStatus === 'ongoing') {
      filter.startDate = { $lte: now };
      filter.$or = filter.$or || [];
      filter.endDate = { $gte: now };
    } else if (timeStatus === 'past') {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { endDate: { $lt: now } },
            { endDate: { $exists: false }, startDate: { $lt: now } }
          ]
        }
      ];
    }

    // Free / Paid filter
    if (free === 'true') {
      filter.free = true;
    } else if (free === 'false') {
      filter.free = false;
      // Price cap: filter events where at least one zone has price <= priceMax
      if (priceMax !== undefined && priceMax !== '') {
        filter['seatZones'] = {
          $elemMatch: { price: { $lte: Number(priceMax) } }
        };
      }
    }

    // Sort
    const sortMap = {
      date_asc:  { startDate: 1 },
      date_desc: { startDate: -1 },
      popular:   { currentAttendees: -1, startDate: 1 },
      newest:    { createdAt: -1 },
    };
    const sortOption = sortMap[sort] || { startDate: 1 };

    const result = await paginate(Event, filter, { page, size, sort: sortOption });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/trending — top 10 by currentAttendees
 */
export const getTrending = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      status: 'PUBLISHED',
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { startDate: { $gte: now } }
      ]
    })
      .sort({ currentAttendees: -1 })
      .limit(10)
      .lean();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/featured — admin pinned
 */
export const getFeatured = async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      status: 'PUBLISHED',
      isFeatured: true,
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
        { startDate: { $gte: now } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/tags — unique tags
 */
export const getTags = async (req, res) => {
  try {
    const tags = await Event.distinct('tags', { status: 'PUBLISHED' });
    res.json(tags.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/locations — unique locations
 */
export const getLocations = async (req, res) => {
  try {
    const locations = await Event.distinct('location', { status: 'PUBLISHED' });
    res.json(locations.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/:id — event detail
 */
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
      return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    }

    let spotsLeft = 0;
    if (event.free) {
      if (event.maxCapacity === 0) {
        spotsLeft = 2147483647; // unlimited
      } else {
        spotsLeft = Math.max(0, event.maxCapacity - event.currentAttendees);
      }
    }

    // Check if current user already registered
    let alreadyRegistered = false;
    if (req.user) {
      const reg = await Registration.findOne({
        userId: req.user._id,
        eventId: event._id,
        status: 'CONFIRMED'
      });
      alreadyRegistered = !!reg;
    }

    res.json({ event, spotsLeft, alreadyRegistered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/:id/similar — events with similar tags
 */
export const getSimilar = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.json([]);

    const now = new Date();
    const similar = await Event.find({
      _id: { $ne: event._id },
      status: 'PUBLISHED',
      $and: [
        {
          $or: [
            { endDate: { $gte: now } },
            { endDate: null },
            { startDate: { $gte: now } }
          ]
        },
        {
          $or: [
            { tags: { $in: event.tags || [] } },
            { category: event.category }
          ]
        }
      ]
    }).sort({ currentAttendees: -1 }).limit(4).lean();

    res.json(similar);
  } catch (error) {
    res.json([]);
  }
};


/**
 * GET /api/events/:id/reviews
 */
export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ eventId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: reviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/events/:id/reviews
 */
export const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });

    // Check if user already reviewed
    const existing = await Review.findOne({ userId: req.user._id, eventId });
    if (existing) {
      return res.status(400).json({ error: 'Bạn đã đánh giá sự kiện này rồi' });
    }

    const review = await Review.create({
      userId: req.user._id,
      userFullName: req.user.fullName,
      eventId,
      rating: parseInt(rating),
      comment
    });

    res.status(201).json({ message: 'Đánh giá thành công!', data: review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/events/:id/register — free event registration
 */
export const registerEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    if (event.status !== 'PUBLISHED') return res.status(400).json({ error: 'Sự kiện chưa mở đăng ký' });

    // Check if event has ended
    const eventEnd = event.endDate || event.startDate;
    if (eventEnd && new Date(eventEnd) < new Date()) {
      return res.status(400).json({ error: 'Sự kiện đã kết thúc, không thể đăng ký' });
    }

    if (!event.free) return res.status(400).json({ error: 'Sự kiện này cần mua vé' });

    // Check capacity (atomic)
    if (event.maxCapacity > 0 && event.currentAttendees >= event.maxCapacity) {
      return res.status(400).json({ error: 'Sự kiện đã đầy' });
    }

    // Check duplicate
    const existing = await Registration.findOne({
      userId: req.user._id, eventId, status: 'CONFIRMED'
    });
    if (existing) {
      return res.status(400).json({ error: 'Bạn đã đăng ký sự kiện này rồi' });
    }

    const registration = await Registration.create({
      userId: req.user._id,
      userFullName: req.user.fullName,
      userEmail: req.user.email,
      eventId,
      eventTitle: event.title
    });

    // Update attendees count
    await Event.findByIdAndUpdate(eventId, { $inc: { currentAttendees: 1 } });

    // Generate ticket
    await Ticket.create({
      registrationId: registration._id,
      eventId,
      eventTitle: event.title,
      userId: req.user._id,
      userFullName: req.user.fullName,
      ticketCode: generateTicketCode(),
      zoneName: 'General',
      eventDate: event.startDate
    });

    // Create notification
    await Notification.create({
      userId: req.user._id,
      title: 'Đăng ký thành công',
      message: `Bạn đã đăng ký thành công sự kiện "${event.title}"`,
      type: 'REGISTRATION',
      link: `/events/${eventId}`
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id}`).emit('notification', {
        title: 'Đăng ký thành công',
        message: `Đăng ký "${event.title}" thành công!`
      });
    }

    res.json({ message: 'Đăng ký sự kiện thành công! 🎉' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Bạn đã đăng ký sự kiện này rồi' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/events/:id/hold — Giữ chỗ 5 phút (Seat Hold)
 * Body: { zoneId, quantity }
 */
export const holdSeats = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { zoneId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    if (event.status !== 'PUBLISHED') return res.status(400).json({ error: 'Sự kiện chưa mở bán vé' });
    if (event.free) return res.status(400).json({ error: 'Sự kiện miễn phí không cần giữ chỗ' });

    const zone = event.seatZones.id(zoneId);
    if (!zone) return res.status(400).json({ error: 'Khu vực không tồn tại' });

    const now = new Date();

    // Tính tổng số ghế đang bị giữ bởi người khác (active holds, trừ hold cũ của chính user này)
    const activeHoldsAgg = await SeatHold.aggregate([
      {
        $match: {
          eventId: event._id,
          zoneId: zoneId.toString(),
          expiresAt: { $gt: now },
          userId: { $ne: req.user._id }
        }
      },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const activeHeld = activeHoldsAgg[0]?.total || 0;

    const available = zone.totalSeats - zone.soldSeats - activeHeld;
    if (qty > available) {
      return res.status(400).json({
        error: `Khu "${zone.name}" chỉ còn ${available} ghế có thể giữ (sau khi trừ đặt chỗ đang chờ)`,
        available
      });
    }

    const HOLD_MINUTES = 5;
    const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

    // Xoá hold cũ của user này cho zone này (nếu có) rồi tạo mới
    await SeatHold.deleteMany({ eventId: event._id, zoneId: zoneId.toString(), userId: req.user._id });

    const hold = await SeatHold.create({
      eventId: event._id,
      zoneId: zoneId.toString(),
      userId: req.user._id,
      quantity: qty,
      expiresAt
    });

    res.json({
      message: `Đã giữ ${qty} ghế khu ${zone.name} trong ${HOLD_MINUTES} phút`,
      holdId: hold._id,
      expiresAt,
      zone: { name: zone.name, price: zone.price }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/events/:id/book — paid event booking
 */
export const bookEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { zoneId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    if (event.status !== 'PUBLISHED') return res.status(400).json({ error: 'Sự kiện chưa mở bán vé' });

    // Check if event has ended
    const eventEnd = event.endDate || event.startDate;
    if (eventEnd && new Date(eventEnd) < new Date()) {
      return res.status(400).json({ error: 'Sự kiện đã kết thúc, không thể đặt vé' });
    }

    // Find zone
    const zone = event.seatZones.id(zoneId);
    if (!zone) return res.status(400).json({ error: 'Khu vực không tồn tại' });

    // Kiểm tra Seat Hold còn hiệu lực không?
    const now = new Date();
    const existingHold = await SeatHold.findOne({
      eventId: event._id,
      zoneId: zoneId.toString(),
      userId: req.user._id,
      expiresAt: { $gt: now }
    });
    if (!existingHold) {
      return res.status(400).json({
        error: 'Phiên giữ chỗ đã hết hoặc chưa giữ chỗ. Vui lòng chọn khu vực ghế lại.',
        holdExpired: true
      });
    }
    // Nếu quantity đặt > hold hiện tại → tự nâng hold (miễn là còn ghế)
    if (existingHold.quantity < qty) {
      const activeHoldsAgg = await SeatHold.aggregate([
        {
          $match: {
            eventId: event._id,
            zoneId: zoneId.toString(),
            expiresAt: { $gt: now },
            userId: { $ne: req.user._id }
          }
        },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);
      const activeHeld = activeHoldsAgg[0]?.total || 0;
      const available = zone.totalSeats - zone.soldSeats - activeHeld;
      if (qty > available) {
        return res.status(400).json({
          error: `Khu "${zone.name}" chỉ còn ${available} ghế khả dụng.`,
          soldOut: available === 0
        });
      }
      // Nâng hold lên số lượng mới, gia hạn thêm 5 phút
      existingHold.quantity = qty;
      existingHold.expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
      await existingHold.save();
    }

    const totalPrice = zone.price * qty;

    // Check and deduct balance
    const user = await User.findById(req.user._id);
    if (user.balance < totalPrice) {
      return res.status(400).json({
        error: `Số dư không đủ. Cần ${totalPrice.toLocaleString('vi-VN')}đ, hiện có ${user.balance.toLocaleString('vi-VN')}đ`
      });
    }

    // --- Atomic: Trừ tiền (chống race condition nếu client click 2 lần) ---
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: totalPrice } },
      { $inc: { balance: -totalPrice } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({ error: 'Số dư không đủ hoặc đã bị thay đổi' });
    }

    // --- Atomic: Cập nhật số ghế đã bán (chống Overselling hoàn toàn) ---
    // Chỉ cập nhật nếu soldSeats + qty <= totalSeats
    const updateResult = await Event.updateOne(
      {
        _id: eventId,
        'seatZones._id': zoneId,
        $expr: {
          $lte: [
            { $add: [{ $let: { vars: { z: { $arrayElemAt: [{ $filter: { input: '$seatZones', cond: { $eq: ['$$this._id', { $toObjectId: zoneId }] } } }, 0] } }, in: '$$z.soldSeats' } }, qty] },
            { $let: { vars: { z: { $arrayElemAt: [{ $filter: { input: '$seatZones', cond: { $eq: ['$$this._id', { $toObjectId: zoneId }] } } }, 0] } }, in: '$$z.totalSeats' } }
          ]
        }
      },
      {
        $inc: {
          'seatZones.$.soldSeats': qty,
          currentAttendees: qty
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      // Hoàn tiền lại cho user vì không còn ghế
      await User.findByIdAndUpdate(user._id, { $inc: { balance: totalPrice } });
      return res.status(400).json({
        error: `Khu "${zone.name}" đã hết ghế. Vui lòng chọn lại khu vực.`,
        soldOut: true
      });
    }

    // Create booking
    const booking = await Booking.create({
      userId: req.user._id,
      userFullName: req.user.fullName,
      eventId,
      eventTitle: event.title,
      zoneId,
      zoneName: zone.name,
      quantity: qty,
      pricePerSeat: zone.price,
      totalPrice
    });

    // Generate tickets
    for (let i = 0; i < qty; i++) {
      await Ticket.create({
        bookingId: booking._id,
        eventId,
        eventTitle: event.title,
        userId: req.user._id,
        userFullName: req.user.fullName,
        ticketCode: generateTicketCode(),
        zoneName: zone.name,
        eventDate: event.startDate
      });
    }

    // Xoá Seat Hold sau khi đặt vé thành công
    await SeatHold.deleteMany({ eventId: event._id, zoneId: zoneId.toString(), userId: req.user._id });

    // Notification
    await Notification.create({
      userId: req.user._id,
      title: 'Đặt vé thành công',
      message: `Bạn đã đặt ${qty} vé khu ${zone.name} — "${event.title}"`,
      type: 'BOOKING',
      link: `/my-tickets`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id}`).emit('notification', {
        title: 'Đặt vé thành công',
        message: `Đặt ${qty} vé "${event.title}" thành công! 🎉`
      });
    }

    res.json({
      message: `Đặt ${qty} vé khu ${zone.name} thành công! 🎉`,
      booking,
      newBalance: updatedUser.balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/events/:id/report — submit a violation report
 */
export const reportEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('title organizerId status');
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });

    const { reason, description } = req.body;
    const validReasons = ['SPAM', 'MISLEADING', 'INAPPROPRIATE', 'FRAUD', 'DUPLICATE', 'OTHER'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Lý do báo cáo không hợp lệ' });
    }

    const report = await EventReport.create({
      eventId:       event._id,
      eventTitle:    event.title,
      reporterId:    req.user._id,
      reporterName:  req.user.fullName,
      reporterEmail: req.user.email,
      reason,
      description: description?.substring(0, 1000) || ''
    });

    res.status(201).json({ message: 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét sớm nhất.', report });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Bạn đã báo cáo sự kiện này rồi.' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/:id/my-report — check if current user already reported
 */
export const getMyReport = async (req, res) => {
  try {
    const report = await EventReport.findOne({
      eventId: req.params.id,
      reporterId: req.user._id
    }).select('reason status createdAt').lean();
    res.json({ report: report || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/events/:id/waitlist
 */
export const addToWaitlist = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });

    const existing = await Waitlist.findOne({ eventId, userId });
    if (existing) {
      return res.status(400).json({ error: 'Bạn đã đăng ký nhận thông báo' });
    }

    await Waitlist.create({ eventId, userId });
    res.json({ message: 'Chúng tôi sẽ thông báo cho bạn khi có chỗ trống! 🔔' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/events/:id/waitlist — rời danh sách chờ
 */
export const removeFromWaitlist = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    const deleted = await Waitlist.findOneAndDelete({ eventId, userId });
    if (!deleted) return res.status(404).json({ error: 'Bạn chưa ở trong danh sách chờ' });

    res.json({ message: 'Đã rời danh sách chờ' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/events/:id/waitlist-status
 */
export const getWaitlistStatus = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;
    const existing = await Waitlist.findOne({ eventId, userId });
    const count = await Waitlist.countDocuments({ eventId });
    res.json({ onWaitlist: !!existing, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/waitlist/my — danh sách chờ của người dùng hiện tại
 */
export const getMyWaitlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const entries = await Waitlist.find({ userId })
      .populate('eventId', 'title location startDate endDate bannerImagePath free status seatZones maxCapacity currentAttendees')
      .sort({ createdAt: -1 })
      .lean();

    const result = entries.map(e => {
      const ev = e.eventId;
      if (!ev) return null;
      const now = new Date();
      const eventEnd = ev.endDate || ev.startDate;
      const isPast = eventEnd && new Date(eventEnd) < now;
      let spotsLeft = 0;
      if (ev.free) {
        spotsLeft = ev.maxCapacity > 0 ? Math.max(0, ev.maxCapacity - ev.currentAttendees) : 2147483647;
      } else {
        spotsLeft = (ev.seatZones || []).reduce((s, z) => s + Math.max(0, z.totalSeats - z.soldSeats), 0);
      }
      return {
        _id: e._id,
        eventId: ev._id,
        eventTitle: ev.title,
        eventLocation: ev.location,
        eventStartDate: ev.startDate,
        eventEndDate: ev.endDate,
        eventBanner: ev.bannerImagePath,
        eventFree: ev.free,
        eventStatus: ev.status,
        spotsLeft,
        isPast,
        notified: e.notified,
        createdAt: e.createdAt
      };
    }).filter(Boolean);

    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
