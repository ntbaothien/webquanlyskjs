import Ticket from '../models/Ticket.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Event from '../models/Event.js';

/**
 * GET /api/my-registrations — free event registrations for current user
 */
export const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with event data
    const enriched = await Promise.all(registrations.map(async (reg) => {
      const event = await Event.findById(reg.eventId).lean();
      return {
        ...reg,
        id: reg._id,
        eventLocation: event?.location || '',
        eventStartDate: event?.startDate || null,
        registeredAt: reg.createdAt
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/my-bookings — paid event bookings for current user
 */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = bookings.map(b => ({
      ...b,
      id: b._id,
      finalAmount: b.totalPrice
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/registrations/:id — cancel free registration
 */
export const cancelRegistration = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: 'Không tìm thấy đăng ký' });
    if (reg.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Không có quyền hủy đăng ký này' });
    }

    reg.status = 'CANCELLED';
    await reg.save();

    // Decrease attendees
    await Event.findByIdAndUpdate(reg.eventId, { $inc: { currentAttendees: -1 } });

    // Cancel associated ticket
    await Ticket.updateMany(
      { registrationId: reg._id },
      { status: 'CANCELLED' }
    );

    res.json({ message: 'Đã hủy đăng ký thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/bookings/:id — cancel booking + refund
 */
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đặt vé' });
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Không có quyền hủy vé này' });
    }
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Vé đã được hủy trước đó' });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    // Refund balance
    await User.findByIdAndUpdate(booking.userId, {
      $inc: { balance: booking.totalPrice }
    });

    // Restore seats
    await Event.updateOne(
      { _id: booking.eventId, 'seatZones._id': booking.zoneId },
      {
        $inc: {
          'seatZones.$.soldSeats': -booking.quantity,
          currentAttendees: -booking.quantity
        }
      }
    );

    // Cancel associated tickets
    await Ticket.updateMany(
      { bookingId: booking._id },
      { status: 'CANCELLED' }
    );

    // Notification
    await Notification.create({
      userId: booking.userId,
      title: 'Hủy vé thành công',
      message: `Đã hoàn ${booking.totalPrice.toLocaleString('vi-VN')}đ vào số dư`,
      type: 'BOOKING'
    });

    res.json({ message: 'Đã hủy vé và hoàn tiền thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/my-tickets — user's tickets (registrations + bookings combined)
 */
export const getMyTickets = async (req, res) => {
  try {
    const [registrations, bookings, tickets] = await Promise.all([
      Registration.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Booking.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Ticket.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean()
    ]);

    res.json({ registrations, bookings, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/tickets/:code — ticket detail by code
 */
export const getTicketByCode = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketCode: req.params.code }).lean();
    if (!ticket) return res.status(404).json({ error: 'Vé không tồn tại' });

    if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'ORGANIZER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Không có quyền xem vé này' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/tickets/:code/check-in
 */
export const checkIn = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketCode: req.params.code });
    if (!ticket) return res.status(404).json({ error: 'Vé không tồn tại' });

    if (ticket.status === 'USED') {
      return res.status(400).json({ error: 'Vé đã được sử dụng', usedAt: ticket.usedAt });
    }
    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Vé đã bị hủy' });
    }

    ticket.status = 'USED';
    ticket.usedAt = new Date();
    await ticket.save();

    await Notification.create({
      userId: ticket.userId,
      title: 'Check-in thành công',
      message: `Vé ${ticket.ticketCode} đã được check-in cho sự kiện "${ticket.eventTitle}"`,
      type: 'SYSTEM'
    });

    res.json({ message: 'Check-in thành công! ✅', ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/notifications/:id/read
 */
export const markRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/notifications/read-all
 */
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
