const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const User = require('../models/User');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Banner = require('../models/Banner');
const Campaign = require('../models/Campaign');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');
const { paginate, paginateResponse } = require('../utils/pagination');

// Tất cả admin routes yêu cầu auth + Admin role
router.use(auth, role('Admin'));

// ============================================================
// GET /api/admin/dashboard — Tổng quan thống kê
// ============================================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const [totalUsers, totalEvents, totalOrders, revenueResult, totalTickets] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Event.countDocuments({ status: 'Published' }),
      Order.countDocuments({ status: 'Paid' }),
      Payment.aggregate([
        { $match: { status: 'Success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Ticket.countDocuments({ status: { $in: ['Active', 'Used'] } }),
    ]);

    sendSuccess(res, {
      totalUsers,
      totalEvents,
      totalOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      totalTickets,
    });
  } catch (err) { next(err); }
});

// GET /api/admin/revenue — Doanh thu theo ngày/tháng
router.get('/revenue', async (req, res, next) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    const match = { status: 'Success' };
    if (from || to) {
      match.paidAt = {};
      if (from) match.paidAt.$gte = new Date(from);
      if (to) match.paidAt.$lte = new Date(to);
    }

    const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const data = await Payment.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: dateFormat, date: '$paidAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/admin/users — Danh sách users
// ============================================================
router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { search, role: filterRole } = req.query;
    const filter = {};
    if (filterRole) filter.role = filterRole;
    if (search) filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    sendSuccess(res, paginateResponse(users, total, page, limit));
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role: newRole } = req.body;
    if (!['Admin', 'Organizer', 'User'].includes(newRole)) {
      return sendBadRequest(res, 'Role không hợp lệ');
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role: newRole }, { new: true });
    if (!user) return sendNotFound(res, 'Người dùng không tồn tại');
    sendSuccess(res, user, `Đã thay đổi role thành ${newRole}`);
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    sendSuccess(res, {}, 'Đã vô hiệu hóa người dùng');
  } catch (err) { next(err); }
});

// GET /api/admin/events — Tất cả events
router.get('/events', async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const { status } = req.query;
    const filter = status ? { status } : {};
    const [events, total] = await Promise.all([
      Event.find(filter).populate('createdBy', 'fullName email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);
    sendSuccess(res, paginateResponse(events, total, page, limit));
  } catch (err) { next(err); }
});

// ============================================================
// BANNERS
// ============================================================
router.get('/banners', async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ priority: -1, createdAt: -1 });
    sendSuccess(res, banners);
  } catch (err) { next(err); }
});

router.post('/banners', async (req, res, next) => {
  try {
    const banner = await Banner.create({ ...req.body, createdBy: req.user._id });
    sendCreated(res, banner, 'Tạo banner thành công');
  } catch (err) { next(err); }
});

router.put('/banners/:id', async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) return sendNotFound(res, 'Banner không tồn tại');
    sendSuccess(res, banner, 'Đã cập nhật banner');
  } catch (err) { next(err); }
});

router.delete('/banners/:id', async (req, res, next) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    sendSuccess(res, {}, 'Đã xóa banner');
  } catch (err) { next(err); }
});

// ============================================================
// CAMPAIGNS
// ============================================================
router.get('/campaigns', async (req, res, next) => {
  try {
    const campaigns = await Campaign.find().populate('createdBy', 'fullName').sort({ createdAt: -1 });
    sendSuccess(res, campaigns);
  } catch (err) { next(err); }
});

router.post('/campaigns', async (req, res, next) => {
  try {
    const campaign = await Campaign.create({ ...req.body, createdBy: req.user._id });
    sendCreated(res, campaign, 'Tạo chiến dịch thành công');
  } catch (err) { next(err); }
});

router.put('/campaigns/:id', async (req, res, next) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) return sendNotFound(res, 'Chiến dịch không tồn tại');
    sendSuccess(res, campaign, 'Đã cập nhật chiến dịch');
  } catch (err) { next(err); }
});

router.delete('/campaigns/:id', async (req, res, next) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    sendSuccess(res, {}, 'Đã xóa chiến dịch');
  } catch (err) { next(err); }
});

// POST /api/admin/campaigns/:id/send — Kích hoạt gửi chiến dịch
router.post('/campaigns/:id/send', async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return sendNotFound(res, 'Chiến dịch không tồn tại');
    if (campaign.status === 'Sent') return sendBadRequest(res, 'Chiến dịch đã được gửi');

    // TODO: Bull Queue gửi email hàng loạt
    campaign.status = 'Sent';
    campaign.sentAt = new Date();
    campaign.sentCount = 0; // Sẽ tăng dần khi email được gửi qua queue
    await campaign.save();

    sendSuccess(res, campaign, 'Chiến dịch đã được kích hoạt gửi');
  } catch (err) { next(err); }
});

module.exports = router;
