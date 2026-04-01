import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import { paginate } from '../utils/pagination.js';

/**
 * GET /api/admin/dashboard
 */
export const getDashboard = async (req, res) => {
  try {
    const [totalEvents, publishedEvents, totalUsers, totalRegistrations, totalBookings] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'PUBLISHED' }),
      User.countDocuments(),
      Registration.countDocuments(),
      Booking.countDocuments()
    ]);

    const top5Events = await Event.find()
      .sort({ currentAttendees: -1 })
      .limit(5)
      .lean();

    res.json({
      totalEvents,
      publishedEvents,
      totalUsers,
      totalRegistrations: totalRegistrations + totalBookings,
      top5Events
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/revenue
 */
export const getRevenue = async (req, res) => {
  try {
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'CONFIRMED' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const revenueByEvent = await Booking.aggregate([
      { $match: { status: 'CONFIRMED' } },
      {
        $group: {
          _id: '$eventId',
          eventTitle: { $first: '$eventTitle' },
          revenue: { $sum: '$totalPrice' },
          totalBookings: { $sum: '$quantity' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      revenueByEvent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/reports
 */
export const getReports = async (req, res) => {
  try {
    const eventsByMonthAgg = await Event.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const eventsByMonth = {};
    eventsByMonthAgg.forEach(e => { eventsByMonth[e._id] = e.count; });

    const usersByRoleAgg = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const usersByRole = {};
    usersByRoleAgg.forEach(u => { usersByRole[u._id] = u.count; });

    const recentEvents = await Event.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ eventsByMonth, usersByRole, recentEvents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/users — paginated with search/filter
 */
export const getUsers = async (req, res) => {
  try {
    const { keyword, role: roleFilter, page, size } = req.query;
    const filter = {};

    if (keyword) {
      filter.$or = [
        { fullName: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (roleFilter) {
      filter.role = roleFilter;
    }

    const result = await paginate(User, filter, { page, size, sort: { createdAt: -1 } });

    // Remove password, add id field, map isLocked to enabled
    result.content = result.content.map(u => {
      const { password, twoFA, ...safe } = u;
      return { ...safe, id: u._id, enabled: !u.isLocked };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/users/:id — user detail with stats
 */
export const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -twoFA').lean();
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

    const [eventsCreated, registrations, bookings] = await Promise.all([
      Event.countDocuments({ organizerId: user._id }),
      Registration.countDocuments({ userId: user._id }),
      Booking.countDocuments({ userId: user._id })
    ]);

    res.json({
      user: { ...user, id: user._id, enabled: !user.isLocked },
      eventsCreated,
      registrations: registrations + bookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/admin/users/:id — update role, lock, balance, etc.
 */
export const updateUser = async (req, res) => {
  try {
    const { role, isLocked, balance, fullName } = req.body;
    const updates = {};
    if (role) updates.role = role;
    if (isLocked !== undefined) updates.isLocked = isLocked;
    if (balance !== undefined) updates.balance = parseFloat(balance);
    if (fullName) updates.fullName = fullName;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('-password -twoFA');
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/admin/users/:id/toggle — toggle lock/unlock
 */
export const toggleUserLock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

    user.isLocked = !user.isLocked;
    await user.save();

    res.json({
      message: user.isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
      isLocked: user.isLocked
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/admin/users/:id/role — change user role
 */
export const changeUserRole = async (req, res) => {
  try {
    const newRole = req.query.role || req.body.role;
    if (!['ATTENDEE', 'ORGANIZER', 'ADMIN'].includes(newRole)) {
      return res.status(400).json({ error: 'Role không hợp lệ' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: newRole },
      { new: true }
    ).select('-password -twoFA');

    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
    res.json({ message: 'Đã đổi quyền thành công', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
    res.json({ message: 'Xóa user thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/events — paginated with search/filter
 */
export const getAllEvents = async (req, res) => {
  try {
    const { keyword, status, page, size } = req.query;
    const filter = {};

    if (keyword) {
      filter.title = { $regex: keyword, $options: 'i' };
    }
    if (status) {
      filter.status = status;
    }

    const result = await paginate(Event, filter, { page, size, sort: { createdAt: -1 } });
    // Add id field
    result.content = result.content.map(e => ({ ...e, id: e._id }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/admin/events/:id
 */
export const updateEvent = async (req, res) => {
  try {
    const { status, isFeatured } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;

    const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/admin/events/:id
 */
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    res.json({ message: 'Xóa sự kiện thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/events/:id/registrations
 */
export const getEventRegistrations = async (req, res) => {
  try {
    const [registrations, bookings] = await Promise.all([
      Registration.find({ eventId: req.params.id }).sort({ createdAt: -1 }).lean(),
      Booking.find({ eventId: req.params.id }).sort({ createdAt: -1 }).lean()
    ]);

    // Add id and map fields
    const enrichedRegs = registrations.map(r => ({ ...r, id: r._id, registeredAt: r.createdAt }));
    const enrichedBookings = bookings.map(b => ({ ...b, id: b._id, finalAmount: b.totalPrice }));

    res.json({ registrations: enrichedRegs, bookings: enrichedBookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
