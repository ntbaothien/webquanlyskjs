import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { paginate } from '../utils/pagination.js';
import { generateTicketCode } from '../utils/generateTicketCode.js';

/**
 * GET /api/events — paginated, filterable
 */
export const getEvents = async (req, res) => {
  try {
    const { keyword, tag, location, dateFrom, dateTo, page, size } = req.query;
    const filter = { status: 'PUBLISHED' };

    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (tag) {
      filter.tags = { $regex: new RegExp(`^${tag}$`, 'i') };
    }
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    if (dateFrom || dateTo) {
      filter.startDate = {};
      if (dateFrom) filter.startDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.startDate.$lte = end;
      }
    }

    const result = await paginate(Event, filter, {
      page, size,
      sort: { startDate: 1 }
    });

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

    // Check capacity
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

    const available = zone.totalSeats - zone.soldSeats;
    if (qty > available) {
      return res.status(400).json({ error: `Khu "${zone.name}" chỉ còn ${available} ghế` });
    }

    const totalPrice = zone.price * qty;

    // Check and deduct balance
    const user = await User.findById(req.user._id);
    if (user.balance < totalPrice) {
      return res.status(400).json({
        error: `Số dư không đủ. Cần ${totalPrice.toLocaleString('vi-VN')}đ, hiện có ${user.balance.toLocaleString('vi-VN')}đ`
      });
    }

    // Deduct balance atomically
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: totalPrice } },
      { $inc: { balance: -totalPrice } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({ error: 'Số dư không đủ hoặc đã bị thay đổi' });
    }

    // Update sold seats
    await Event.updateOne(
      { _id: eventId, 'seatZones._id': zoneId },
      {
        $inc: {
          'seatZones.$.soldSeats': qty,
          currentAttendees: qty
        }
      }
    );

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
