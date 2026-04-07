import ResellListing from '../models/ResellListing.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import { generateTicketCode } from '../utils/generateTicketCode.js';
import { rewardPoints } from './userController.js';

/**
 * GET /api/marketplace — Xem toàn bộ chợ bán vé (có thể filter theo eventId)
 */
export const listResellMarket = async (req, res) => {
  try {
    const { eventId, page = 0, size = 20 } = req.query;
    const pageNum = Math.max(0, parseInt(page));
    const pageSize = Math.min(50, Math.max(1, parseInt(size)));

    const filter = { status: 'ACTIVE' };
    if (eventId) filter.eventId = eventId;

    const [listings, total] = await Promise.all([
      ResellListing.find(filter)
        .populate('sellerId', 'fullName avatarUrl')
        .populate('eventId', 'title bannerImagePath location startDate')
        .sort({ createdAt: -1 })
        .skip(pageNum * pageSize)
        .limit(pageSize)
        .lean(),
      ResellListing.countDocuments(filter)
    ]);

    res.json({
      content: listings,
      totalPages: Math.ceil(total / pageSize),
      totalElements: total,
      page: pageNum
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/marketplace/my — Xem vé mình đang treo
 */
export const getMyListings = async (req, res) => {
  try {
    const listings = await ResellListing.find({ sellerId: req.user._id })
      .populate('ticketId', 'ticketCode zoneName')
      .populate('eventId', 'title bannerImagePath location startDate')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: listings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/marketplace — Seller treo vé lên chợ
 * Body: { ticketId, listingPrice }
 */
export const createListing = async (req, res) => {
  try {
    const { ticketId, listingPrice } = req.body;
    const price = Number(listingPrice);

    if (!ticketId || isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }

    // Kiểm tra vé có thuộc về user không
    const ticket = await Ticket.findOne({ _id: ticketId, userId: req.user._id });
    if (!ticket) {
      return res.status(404).json({ error: 'Không tìm thấy vé hoặc vé không thuộc về bạn' });
    }

    if (ticket.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Vé đang ở trạng thái ${ticket.status}, không thể đăng bán` });
    }

    // Kiểm tra sự kiện chưa diễn ra
    const event = await Event.findById(ticket.eventId).lean();
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    if (event.startDate && new Date(event.startDate) < new Date()) {
      return res.status(400).json({ error: 'Sự kiện đã diễn ra, không thể bán lại vé' });
    }

    // Giá bán không được quá giá gốc (nếu có ghi nhận)
    if (ticket.originalPrice > 0 && price > ticket.originalPrice * 1.5) {
      return res.status(400).json({
        error: `Giá bán không được vượt quá 150% giá gốc (${(ticket.originalPrice * 1.5).toLocaleString('vi-VN')}đ)`
      });
    }

    // Tạo listing
    const listing = await ResellListing.create({
      ticketId: ticket._id,
      sellerId: req.user._id,
      eventId: ticket.eventId,
      eventTitle: ticket.eventTitle,
      zoneName: ticket.zoneName,
      eventDate: ticket.eventDate,
      listingPrice: price,
      originalPrice: ticket.originalPrice || 0
    });

    // Cập nhật trạng thái vé
    ticket.status = 'RESELLING';
    ticket.resellListingId = listing._id;
    await ticket.save();

    res.status(201).json({ message: 'Đã đăng vé lên chợ thành công!', listing });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Vé này đã được đăng bán rồi' });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/marketplace/:id — Seller hủy listing
 */
export const cancelListing = async (req, res) => {
  try {
    const listing = await ResellListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy listing' });

    if (listing.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy listing này' });
    }

    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Listing này không thể hủy' });
    }

    listing.status = 'CANCELLED';
    await listing.save();

    // Đặt lại trạng thái vé
    await Ticket.findByIdAndUpdate(listing.ticketId, {
      status: 'ACTIVE',
      resellListingId: null
    });

    res.json({ message: 'Đã hủy listing thành công. Vé đã được khôi phục.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/marketplace/:id/buy — Buyer mua vé trên chợ
 * Hệ thống sẽ:
 * 1. Trừ tiền Buyer
 * 2. Chuyển tiền (trừ phí 5%) cho Seller
 * 3. Thu hồi vé cũ (TRANSFERRED), tạo vé mới cho Buyer
 */
export const buyResellTicket = async (req, res) => {
  try {
    const listing = await ResellListing.findById(req.params.id).populate('ticketId');
    if (!listing) return res.status(404).json({ error: 'Không tìm thấy listing' });
    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Vé này đã được bán hoặc bị hủy' });
    }

    if (listing.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Bạn không thể mua vé của chính mình' });
    }

    const buyer = await User.findById(req.user._id);
    const price = listing.listingPrice;

    if (buyer.balance < price) {
      return res.status(400).json({
        error: `Số dư không đủ. Cần ${price.toLocaleString('vi-VN')}đ, hiện có ${buyer.balance.toLocaleString('vi-VN')}đ`
      });
    }

    // Tính phí nền tảng
    const platformFee = Math.round(price * (listing.platformFeePercent / 100));
    const sellerReceives = price - platformFee;

    // Atomic: trừ tiền buyer
    const updatedBuyer = await User.findOneAndUpdate(
      { _id: buyer._id, balance: { $gte: price } },
      { $inc: { balance: -price } },
      { new: true }
    );
    if (!updatedBuyer) {
      return res.status(400).json({ error: 'Số dư không đủ hoặc đã thay đổi' });
    }

    // Cộng tiền cho seller (trừ phí)
    await User.findByIdAndUpdate(listing.sellerId, { $inc: { balance: sellerReceives } });

    // Thu hồi vé cũ → TRANSFERRED
    const oldTicket = listing.ticketId;
    await Ticket.findByIdAndUpdate(oldTicket._id, {
      status: 'TRANSFERRED',
      previousOwnerId: listing.sellerId
    });

    // Tạo vé mới cho buyer
    const newTicket = await Ticket.create({
      bookingId: oldTicket.bookingId,
      registrationId: oldTicket.registrationId,
      eventId: oldTicket.eventId,
      eventTitle: oldTicket.eventTitle,
      userId: req.user._id,
      userFullName: req.user.fullName,
      ticketCode: generateTicketCode(),
      zoneName: oldTicket.zoneName,
      status: 'ACTIVE',
      eventDate: oldTicket.eventDate,
      originalPrice: price,
      previousOwnerId: listing.sellerId
    });

    // Cập nhật listing
    listing.status = 'SOLD';
    listing.buyerId = req.user._id;
    listing.soldAt = new Date();
    await listing.save();

    // Thông báo cho buyer và seller
    const io = req.app.get('io');
    await Notification.create({
      userId: req.user._id,
      title: 'Mua vé thành công!',
      message: `Bạn đã mua vé sự kiện "${oldTicket.eventTitle}" với giá ${price.toLocaleString('vi-VN')}đ`,
      type: 'BOOKING',
      link: '/my-tickets'
    });
    await Notification.create({
      userId: listing.sellerId,
      title: 'Vé đã được bán!',
      message: `Vé "${oldTicket.eventTitle}" đã được bán với giá ${price.toLocaleString('vi-VN')}đ. Bạn nhận được ${sellerReceives.toLocaleString('vi-VN')}đ (đã trừ phí ${platformFee.toLocaleString('vi-VN')}đ).`,
      type: 'BOOKING',
      link: '/profile'
    });

    if (io) {
      io.to(`user:${req.user._id}`).emit('notification', {
        title: 'Mua vé thành công!',
        message: `Đã mua vé "${oldTicket.eventTitle}"!`
      });
      io.to(`user:${listing.sellerId}`).emit('notification', {
        title: 'Vé đã được bán!',
        message: `Vé "${oldTicket.eventTitle}" đã bán thành công!`
      });
    }

    // Thưởng điểm cho buyer
    try {
      await rewardPoints(req.user._id, 'BUY_RESELL_TICKET', `Mua vé chợ: ${oldTicket.eventTitle}`);
    } catch (e) { /* không block */ }

    res.json({
      message: 'Mua vé thành công! Vé đã được chuyển vào tài khoản của bạn.',
      ticket: newTicket,
      newBalance: updatedBuyer.balance - price // đã trừ ở trên
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
