import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import EventReport from '../models/EventReport.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { paginate } from '../utils/pagination.js';

/**
 * GET /api/admin/dashboard
 */
export const getDashboard = async (req, res) => {
  try {
    const [totalEvents, publishedEvents, totalUsers, totalRegistrations, totalBookings, pendingApprovalCount] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'PUBLISHED' }),
      User.countDocuments(),
      Registration.countDocuments(),
      Booking.countDocuments(),
      Event.countDocuments({ status: 'PENDING_APPROVAL' })
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
      pendingApprovalCount,
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
 * POST /api/admin/events/:id/approve — Duyệt sự kiện: PENDING_APPROVAL → PUBLISHED
 */
export const approveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    if (event.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Sự kiện không ở trạng thái chờ duyệt' });
    }

    event.status = 'PUBLISHED';
    event.rejectionReason = '';
    await event.save();

    // Thông báo cho Organizer
    await Notification.create({
      userId:  event.organizerId,
      title:   'Sự kiện đã được phê duyệt ✅',
      message: `Sự kiện "${event.title}" đã được phê duyệt và đang hiển thị công khai!`,
      type:    'SYSTEM',
      link:    `/events/${event._id}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${event.organizerId}`).emit('notification', {
        title:   'Sự kiện đã được phê duyệt ✅',
        message: `"${event.title}" đã được phê duyệt và hiển thị công khai!`
      });
    }

    res.json({ message: 'Phê duyệt sự kiện thành công', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/admin/events/:id/reject — Từ chối sự kiện: PENDING_APPROVAL → DRAFT
 * Body: { reason: string }
 */
export const rejectEvent = async (req, res) => {
  try {
    const { reason } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    if (event.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Sự kiện không ở trạng thái chờ duyệt' });
    }

    event.status = 'DRAFT'; // Trả về DRAFT để Organizer sửa lại
    event.rejectionReason = reason || 'Không có lý do cụ thể';
    await event.save();

    // Thông báo cho Organizer
    await Notification.create({
      userId:  event.organizerId,
      title:   'Sự kiện bị từ chối ❌',
      message: `Sự kiện "${event.title}" bị từ chối. Lý do: ${event.rejectionReason}`,
      type:    'SYSTEM',
      link:    `/organizer/events`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${event.organizerId}`).emit('notification', {
        title:   'Sự kiện bị từ chối ❌',
        message: `"${event.title}" bị từ chối. Lý do: ${event.rejectionReason}`
      });
    }

    res.json({ message: 'Từ chối sự kiện thành công', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/events/pending — Sự kiện chờ duyệt
 */
export const getPendingEvents = async (req, res) => {
  try {
    const { keyword, page, size } = req.query;
    const filter = { status: 'PENDING_APPROVAL' };
    if (keyword) {
      filter.title = { $regex: keyword, $options: 'i' };
    }
    const result = await paginate(Event, filter, { page, size: size || 20, sort: { createdAt: -1 } });
    result.content = result.content.map(e => ({ ...e, id: e._id }));
    res.json(result);
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

/**
 * GET /api/admin/topups — list all topup requests
 * Query: status, keyword, page, size
 */
export const getTopups = async (req, res) => {
  try {
    const { status, keyword, page, size } = req.query;
    const filter = { type: 'TOPUP' };
    if (status) filter.status = status;
    if (keyword) {
      const rx = { $regex: keyword, $options: 'i' };
      filter.$or = [{ userName: rx }, { userEmail: rx }, { transferCode: rx }];
    }

    const result = await paginate(Transaction, filter, {
      page, size: size || 20, sort: { createdAt: -1 }
    });
    const pendingCount = await Transaction.countDocuments({ type: 'TOPUP', status: 'PENDING' });
    res.json({ ...result, pendingCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/admin/topups/:id — approve or reject a topup
 * Body: { action: 'approve' | 'reject', adminNote? }
 */
export const processTopup = async (req, res) => {
  try {
    const { action, adminNote = '' } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action phải là approve hoặc reject' });
    }

    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Không tìm thấy giao dịch' });
    if (tx.status !== 'PENDING') {
      return res.status(400).json({ error: 'Giao dịch này đã được xử lý rồi' });
    }

    // Do balance update BEFORE saving status (so if it fails, status stays PENDING)
    if (action === 'approve') {
      await User.findByIdAndUpdate(tx.userId, { $inc: { balance: tx.amount } });
    }

    tx.status      = action === 'approve' ? 'COMPLETED' : 'REJECTED';
    tx.adminNote   = adminNote;
    tx.processedBy = req.user._id;
    tx.processedAt = new Date();
    await tx.save();

    // Notify user (non-critical — wrap in try/catch so it doesn't break the response)
    try {
      if (action === 'approve') {
        await Notification.create({
          userId:  tx.userId,
          title:   'Nạp tiền thành công',
          message: `Tài khoản của bạn đã được cộng ${tx.amount.toLocaleString('vi-VN')}đ. Số tiền sẵn sàng sử dụng ngay!`,
          type:    'SYSTEM',
          link:    '/wallet'
        });
      } else {
        await Notification.create({
          userId:  tx.userId,
          title:   'Yêu cầu nạp tiền bị từ chối',
          message: `Yêu cầu nạp ${tx.amount.toLocaleString('vi-VN')}đ (mã ${tx.transferCode}) đã bị từ chối.${adminNote ? ` Lý do: ${adminNote}` : ''}`,
          type:    'SYSTEM',
          link:    '/wallet'
        });
      }
    } catch (notifErr) {
      console.warn('[processTopup] Notification failed (non-critical):', notifErr.message);
    }

    res.json({ message: action === 'approve' ? 'Đã duyệt nạp tiền thành công' : 'Đã từ chối yêu cầu', transaction: tx });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/admin/violations — list all violation reports
 * Query: status, keyword, page, size
 */
export const getViolationReports = async (req, res) => {
  try {
    const { status, keyword, page, size } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (keyword) {
      const rx = { $regex: keyword, $options: 'i' };
      filter.$or = [{ eventTitle: rx }, { reporterName: rx }, { reporterEmail: rx }];
    }

    const result = await paginate(EventReport, filter, {
      page, size: size || 20,
      sort: { createdAt: -1 }
    });

    // Attach pending count for badge
    const pendingCount = await EventReport.countDocuments({ status: 'PENDING' });
    res.json({ ...result, pendingCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/admin/violations/:id — update status + adminNote
 */
export const updateViolationReport = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const valid = ['PENDING', 'REVIEWED', 'DISMISSED'];
    if (status && !valid.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const report = await EventReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });

    if (status) { report.status = status; report.reviewedBy = req.user._id; report.reviewedAt = new Date(); }
    if (adminNote !== undefined) report.adminNote = adminNote;

    await report.save();
    res.json({ message: 'Cập nhật thành công', report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
