import SeatHold from '../models/SeatHold.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import { generateTicketCode } from '../utils/generateTicketCode.js';
import { rewardPoints } from './userController.js';
import { sendGroupBuyInviteEmail } from '../utils/mailer.js';
import crypto from 'crypto';

/**
 * POST /api/group-buy
 * Host tạo nhóm mua: giữ ghế + tạo link mời
 * Body: { eventId, zoneId, quantity, members: [{ email, amount }] }
 */
export const createGroupBuy = async (req, res) => {
  try {
    const { eventId, zoneId, quantity, members } = req.body;
    const qty = parseInt(quantity) || 1;

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Cần ít nhất 1 thành viên trong nhóm' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    if (event.status !== 'PUBLISHED') return res.status(400).json({ error: 'Sự kiện chưa mở bán' });
    if (event.free) return res.status(400).json({ error: 'Sự kiện miễn phí không cần mua nhóm' });

    const zone = event.seatZones.id(zoneId);
    if (!zone) return res.status(400).json({ error: 'Khu vực không tồn tại' });

    // Kiểm tra ghế còn đủ
    const now = new Date();
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
        error: `Khu "${zone.name}" chỉ còn ${available} ghế khả dụng`,
        available
      });
    }

    // Tính số tiền mỗi thành viên phải trả
    const totalPrice = zone.price * qty;
    const hostAmount = req.body.hostAmount || 0;
    const remainingAmount = totalPrice - hostAmount;

    // Validate tổng tiền members
    const membersTotal = members.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    if (Math.abs(membersTotal + hostAmount - totalPrice) > 1) {
      return res.status(400).json({
        error: `Tổng tiền phân chia (${(membersTotal + hostAmount).toLocaleString('vi-VN')}đ) phải bằng tổng giá vé (${totalPrice.toLocaleString('vi-VN')}đ)`
      });
    }

    // Tạo mã mời ngẫu nhiên
    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 phút để nhóm thanh toán

    // Xóa hold cũ của user này
    await SeatHold.deleteMany({ eventId: event._id, zoneId: zoneId.toString(), userId: req.user._id });

    // Tạo Group Hold
    const hold = await SeatHold.create({
      eventId: event._id,
      zoneId: zoneId.toString(),
      userId: req.user._id,
      quantity: qty,
      expiresAt,
      isGroupBuying: true,
      groupInviteCode: inviteCode,
      members: members.map(m => ({
        email: m.email,
        amount: Number(m.amount) || 0,
        isPaid: false
      }))
    });

    res.status(201).json({
      message: 'Đã tạo nhóm mua vé thành công!',
      holdId: hold._id,
      inviteCode,
      expiresAt,
      totalPrice,
      zone: { name: zone.name, price: zone.price },
      shareLink: `/group-checkout/${inviteCode}`,
      members: hold.members
    });

    // Send emails async
    const frontEndUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    hold.members.forEach(member => {
      sendGroupBuyInviteEmail(member.email, {
        hostName: req.user.fullName,
        eventTitle: event.title,
        zoneName: zone.name,
        amount: member.amount,
        expiresAt,
        shareLink: `${frontEndUrl}/group-checkout/${inviteCode}`
      }).catch(err => console.error('Failed to send group buy email:', err));
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/group-buy/:inviteCode — Xem thông tin nhóm mua
 */
export const getGroupBuyInfo = async (req, res) => {
  try {
    const hold = await SeatHold.findOne({
      groupInviteCode: req.params.inviteCode,
      isGroupBuying: true
    })
      .populate('eventId', 'title location startDate bannerImagePath seatZones')
      .populate('userId', 'fullName email avatarUrl')
      .lean();

    if (!hold) return res.status(404).json({ error: 'Không tìm thấy nhóm mua hoặc đã hết hạn' });

    const now = new Date();
    const isExpired = new Date(hold.expiresAt) < now;
    const event = hold.eventId;
    const zone = event?.seatZones?.find(z => z._id.toString() === hold.zoneId);
    const totalPrice = (zone?.price || 0) * hold.quantity;

    res.json({
      hold: {
        ...hold,
        isExpired,
        totalPrice,
        zoneName: zone?.name || '',
        zonePrice: zone?.price || 0,
        paidCount: hold.members.filter(m => m.isPaid).length,
        totalCount: hold.members.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/group-buy/:inviteCode/join — Member thanh toán phần của mình
 */
export const joinGroupBuy = async (req, res) => {
  try {
    const hold = await SeatHold.findOne({
      groupInviteCode: req.params.inviteCode,
      isGroupBuying: true
    });

    if (!hold) return res.status(404).json({ error: 'Không tìm thấy nhóm mua' });

    const now = new Date();
    if (hold.expiresAt < now) {
      return res.status(400).json({ error: 'Phiên nhóm mua đã hết hạn' });
    }

    // Tìm member tương ứng với email hiện tại
    const memberIndex = hold.members.findIndex(m => m.email === req.user.email);
    if (memberIndex === -1) {
      return res.status(403).json({ error: 'Bạn không có trong danh sách nhóm mua này' });
    }

    const member = hold.members[memberIndex];
    if (member.isPaid) {
      return res.status(400).json({ error: 'Bạn đã thanh toán rồi' });
    }

    const amount = member.amount;
    const user = await User.findById(req.user._id);
    if (user.balance < amount) {
      return res.status(400).json({
        error: `Số dư không đủ. Cần ${amount.toLocaleString('vi-VN')}đ, hiện có ${user.balance.toLocaleString('vi-VN')}đ`
      });
    }

    // Trừ tiền member
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({ error: 'Số dư không đủ hoặc đã thay đổi' });
    }

    // Cập nhật trạng thái member
    hold.members[memberIndex].isPaid = true;
    hold.members[memberIndex].userId = req.user._id;
    await hold.save();

    // Kiểm tra tất cả đã trả chưa
    const allPaid = hold.members.every(m => m.isPaid);

    if (allPaid) {
      // Thực hiện booking: trừ tiền host và hoàn tất đặt vé
      await finalizeGroupBooking(hold, req.app.get('io'));
    }

    res.json({
      message: allPaid
        ? 'Tất cả đã thanh toán! Vé đã được phát hành.'
        : `Đã thanh toán ${amount.toLocaleString('vi-VN')}đ. Chờ các thành viên khác thanh toán.`,
      allPaid,
      paidCount: hold.members.filter(m => m.isPaid).length,
      totalCount: hold.members.length,
      newBalance: updatedUser.balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/group-buy/:inviteCode — Host hủy nhóm mua
 */
export const cancelGroupBuy = async (req, res) => {
  try {
    const hold = await SeatHold.findOne({
      groupInviteCode: req.params.inviteCode,
      userId: req.user._id,
      isGroupBuying: true
    });

    if (!hold) return res.status(404).json({ error: 'Không tìm thấy nhóm mua' });

    // Hoàn tiền cho những member đã trả
    const refundPromises = hold.members
      .filter(m => m.isPaid && m.userId)
      .map(m => User.findByIdAndUpdate(m.userId, { $inc: { balance: m.amount } }));

    await Promise.all(refundPromises);

    // Xóa hold
    await SeatHold.findByIdAndDelete(hold._id);

    res.json({ message: 'Đã hủy nhóm mua và hoàn tiền cho các thành viên đã trả.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Helper: Finalize group booking khi tất cả member đã trả tiền
 */
async function finalizeGroupBooking(hold, io) {
  try {
    const event = await Event.findById(hold.eventId);
    if (!event) return;

    const zone = event.seatZones.id(hold.zoneId);
    if (!zone) return;

    const qty = hold.quantity;

    // Trừ ghế đã bán
    await Event.updateOne(
      { _id: event._id, 'seatZones._id': hold.zoneId },
      { $inc: { 'seatZones.$.soldSeats': qty, currentAttendees: qty } }
    );

    // Tạo booking
    const booking = await Booking.create({
      userId: hold.userId,
      userFullName: (await User.findById(hold.userId).select('fullName').lean())?.fullName || '',
      eventId: event._id,
      eventTitle: event.title,
      zoneId: hold.zoneId,
      zoneName: zone.name,
      quantity: qty,
      pricePerSeat: zone.price,
      totalPrice: zone.price * qty,
      status: 'CONFIRMED'
    });

    // Tạo vé cho từng thành viên
    const allMembers = hold.members.filter(m => m.userId);
    const hostUser = await User.findById(hold.userId).select('fullName').lean();

    for (let i = 0; i < qty; i++) {
      const memberId = allMembers[i]?.userId || hold.userId; // Nếu thiếu người, vé lọt về tay Host
      const memberDoc = memberId ? await User.findById(memberId).select('fullName').lean() : null;
      await Ticket.create({
        bookingId: booking._id,
        eventId: event._id,
        eventTitle: event.title,
        userId: memberId,
        userFullName: memberDoc?.fullName || hostUser?.fullName || '',
        ticketCode: generateTicketCode(),
        zoneName: zone.name,
        eventDate: event.startDate,
        originalPrice: zone.price
      });
    }

    // Xóa hold sau khi hoàn tất
    await SeatHold.findByIdAndDelete(hold._id);

    // Thông báo
    const notifMsg = `Nhóm mua vé "${event.title}" đã hoàn tất! Vé đã được phát hành.`;
    if (io) {
      io.to(`user:${hold.userId}`).emit('notification', {
        title: 'Nhóm mua hoàn tất!',
        message: notifMsg
      });
      hold.members.filter(m => m.userId).forEach(m => {
        io.to(`user:${m.userId}`).emit('notification', {
          title: 'Nhóm mua hoàn tất!',
          message: notifMsg
        });
      });
    }
  } catch (err) {
    console.error('finalizeGroupBooking error:', err);
  }
}
