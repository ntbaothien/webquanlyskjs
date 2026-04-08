import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import SeatHold from '../models/SeatHold.js';
import Notification from '../models/Notification.js';
import { generateTicketCode } from '../utils/generateTicketCode.js';
import { rewardPoints } from './userController.js';
import { createMomoPayment, queryMomoTransaction, verifyMomoSignature } from '../utils/momoService.js';

/**
 * POST /api/payment/momo/create
 * Tạo yêu cầu thanh toán MoMo để nạp tiền vào ví
 * Body: { amount }
 */
export const createMomoTopup = async (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = parseInt(amount);

    if (!numAmount || numAmount < 1000) {
      return res.status(400).json({ error: 'Số tiền tối thiểu là 1.000đ' });
    }
    if (numAmount > 50000000) {
      return res.status(400).json({ error: 'Số tiền tối đa là 50.000.000đ' });
    }

    const user = req.user;
    const orderId = `EH_${user._id}_${Date.now()}`;

    const transaction = await Transaction.create({
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      type: 'TOPUP',
      amount: numAmount,
      status: 'PENDING',
      method: 'MOMO',
      note: 'Nạp tiền qua MoMo',
      momoOrderId: orderId,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

    const redirectUrl = `${frontendUrl}/wallet/momo-return?orderId=${orderId}`;
    const ipnUrl = `${backendUrl}/api/payment/momo/ipn`;

    const momoResponse = await createMomoPayment({
      orderId,
      amount: numAmount,
      orderInfo: `Nạp ${numAmount.toLocaleString('vi-VN')}đ vào ví EventHub - ${user.fullName}`,
      redirectUrl,
      ipnUrl,
    });

    if (momoResponse.resultCode !== 0) {
      transaction.status = 'REJECTED';
      transaction.adminNote = `MoMo error: ${momoResponse.message} (code: ${momoResponse.resultCode})`;
      await transaction.save();
      return res.status(400).json({
        error: `MoMo: ${momoResponse.message || 'Lỗi tạo thanh toán'}`,
        resultCode: momoResponse.resultCode
      });
    }

    transaction.transferCode = orderId;
    await transaction.save();

    res.json({
      payUrl: momoResponse.payUrl,
      deeplink: momoResponse.deeplink,
      qrCodeUrl: momoResponse.qrCodeUrl,
      orderId,
      amount: numAmount,
    });
  } catch (error) {
    console.error('MoMo Create Error:', error);
    res.status(500).json({ error: 'Lỗi tạo thanh toán MoMo: ' + error.message });
  }
};

/**
 * POST /api/payment/momo/book
 * Tạo thanh toán MoMo cho việc mua vé sự kiện
 * Body: { eventId, zoneId, quantity }
 */
export const createMomoBooking = async (req, res) => {
  try {
    const { eventId, zoneId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;
    const user = req.user;

    // 1. Validate event
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Sự kiện không tồn tại' });
    if (event.status !== 'PUBLISHED') return res.status(400).json({ error: 'Sự kiện chưa mở bán vé' });

    const eventEnd = event.endDate || event.startDate;
    if (eventEnd && new Date(eventEnd) < new Date()) {
      return res.status(400).json({ error: 'Sự kiện đã kết thúc' });
    }

    // 2. Validate zone
    const zone = event.seatZones.id(zoneId);
    if (!zone) return res.status(400).json({ error: 'Khu vực không tồn tại' });

    // 3. Check seat hold
    const now = new Date();
    const existingHold = await SeatHold.findOne({
      eventId: event._id,
      zoneId: zoneId.toString(),
      userId: user._id,
      expiresAt: { $gt: now }
    });
    if (!existingHold) {
      return res.status(400).json({
        error: 'Phiên giữ chỗ đã hết hoặc chưa giữ chỗ. Vui lòng chọn khu vực ghế lại.',
        holdExpired: true
      });
    }

    const totalPrice = zone.price * qty;
    const orderId = `BOOK_${user._id}_${Date.now()}`;

    // 4. Tạo transaction PENDING với booking metadata
    const transaction = await Transaction.create({
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      type: 'SPEND',
      amount: totalPrice,
      status: 'PENDING',
      method: 'MOMO',
      note: `Mua ${qty} vé "${event.title}" - Khu ${zone.name}`,
      momoOrderId: orderId,
      bookingMeta: {
        eventId: eventId,
        eventTitle: event.title,
        zoneId: zoneId,
        zoneName: zone.name,
        quantity: qty,
        pricePerSeat: zone.price,
      },
    });

    // 5. Gia hạn seat hold thêm 10 phút (đủ thời gian thanh toán MoMo)
    existingHold.expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    await existingHold.save();

    // 6. Gọi MoMo API
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

    const redirectUrl = `${frontendUrl}/wallet/momo-return?orderId=${orderId}`;
    const ipnUrl = `${backendUrl}/api/payment/momo/ipn`;

    const momoResponse = await createMomoPayment({
      orderId,
      amount: totalPrice,
      orderInfo: `Mua ${qty} vé "${event.title}" - Khu ${zone.name} | EventHub`,
      redirectUrl,
      ipnUrl,
    });

    if (momoResponse.resultCode !== 0) {
      transaction.status = 'REJECTED';
      transaction.adminNote = `MoMo error: ${momoResponse.message} (code: ${momoResponse.resultCode})`;
      await transaction.save();
      return res.status(400).json({
        error: `MoMo: ${momoResponse.message || 'Lỗi tạo thanh toán'}`,
        resultCode: momoResponse.resultCode
      });
    }

    transaction.transferCode = orderId;
    await transaction.save();

    res.json({
      payUrl: momoResponse.payUrl,
      deeplink: momoResponse.deeplink,
      qrCodeUrl: momoResponse.qrCodeUrl,
      orderId,
      amount: totalPrice,
    });
  } catch (error) {
    console.error('MoMo Book Error:', error);
    res.status(500).json({ error: 'Lỗi tạo thanh toán: ' + error.message });
  }
};

/**
 * Hàm xử lý hoàn tất booking sau khi MoMo thanh toán thành công
 * Gọi bởi cả IPN và Return handler
 */
async function completeBooking(transaction, io) {
  const meta = transaction.bookingMeta;
  if (!meta || !meta.eventId) return null;

  // Kiểm tra đã tạo booking cho transaction này chưa (idempotency)
  const existingBooking = await Booking.findOne({ momoOrderId: transaction.momoOrderId });
  if (existingBooking) return existingBooking;

  const event = await Event.findById(meta.eventId);
  if (!event) {
    console.error('❌ completeBooking: Event not found:', meta.eventId);
    return null;
  }

  const zone = event.seatZones.id(meta.zoneId);
  if (!zone) {
    console.error('❌ completeBooking: Zone not found:', meta.zoneId);
    return null;
  }

  const qty = meta.quantity;

  // Atomic: Cập nhật số ghế đã bán
  const updateResult = await Event.updateOne(
    {
      _id: meta.eventId,
      'seatZones._id': meta.zoneId,
      $expr: {
        $lte: [
          { $add: [{ $let: { vars: { z: { $arrayElemAt: [{ $filter: { input: '$seatZones', cond: { $eq: ['$$this._id', { $toObjectId: meta.zoneId }] } } }, 0] } }, in: '$$z.soldSeats' } }, qty] },
          { $let: { vars: { z: { $arrayElemAt: [{ $filter: { input: '$seatZones', cond: { $eq: ['$$this._id', { $toObjectId: meta.zoneId }] } } }, 0] } }, in: '$$z.totalSeats' } }
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
    console.error('❌ completeBooking: Không đủ ghế, đã hết');
    // Hoàn tiền
    await User.findByIdAndUpdate(transaction.userId, { $inc: { balance: transaction.amount } });
    transaction.adminNote += ' | Hết ghế, đã hoàn tiền.';
    await transaction.save();
    return null;
  }

  // Create booking
  const booking = await Booking.create({
    userId: transaction.userId,
    userFullName: transaction.userName,
    eventId: meta.eventId,
    eventTitle: meta.eventTitle,
    zoneId: meta.zoneId,
    zoneName: meta.zoneName,
    quantity: qty,
    pricePerSeat: meta.pricePerSeat,
    totalPrice: transaction.amount,
    momoOrderId: transaction.momoOrderId,
  });

  // Generate tickets
  for (let i = 0; i < qty; i++) {
    await Ticket.create({
      bookingId: booking._id,
      eventId: meta.eventId,
      eventTitle: meta.eventTitle,
      userId: transaction.userId,
      userFullName: transaction.userName,
      ticketCode: generateTicketCode(),
      zoneName: meta.zoneName,
      eventDate: event.startDate,
    });
  }

  // Xoá Seat Hold
  await SeatHold.deleteMany({ eventId: meta.eventId, zoneId: meta.zoneId, userId: transaction.userId });

  // Notification
  await Notification.create({
    userId: transaction.userId,
    title: 'Đặt vé thành công 🎉',
    message: `Bạn đã mua ${qty} vé khu ${meta.zoneName} — "${meta.eventTitle}" qua MoMo`,
    type: 'BOOKING',
    link: '/my-tickets'
  });

  if (io) {
    io.to(`user:${transaction.userId}`).emit('notification', {
      title: 'Đặt vé thành công 🎉',
      message: `Mua ${qty} vé "${meta.eventTitle}" thành công!`
    });
  }

  // Thưởng điểm
  try { await rewardPoints(transaction.userId, 'BUY_TICKET', `Mua vé: ${meta.eventTitle}`); } catch (e) {}

  console.log(`✅ Booking created: ${qty} vé "${meta.eventTitle}" cho user ${transaction.userName}`);
  return booking;
}

/**
 * POST /api/payment/momo/ipn
 * Nhận IPN (Instant Payment Notification) từ MoMo
 */
export const momoIPN = async (req, res) => {
  try {
    const ipnData = req.body;
    console.log('📩 MoMo IPN Received:', JSON.stringify(ipnData, null, 2));

    const isValid = verifyMomoSignature(ipnData);
    if (!isValid) {
      console.error('❌ MoMo IPN: Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { orderId, resultCode, transId, amount } = ipnData;

    const transaction = await Transaction.findOne({ momoOrderId: orderId });
    if (!transaction) {
      console.error('❌ MoMo IPN: Transaction not found for orderId:', orderId);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'COMPLETED') {
      return res.status(204).send();
    }

    if (resultCode === 0) {
      const momoAmount = parseInt(amount);
      if (momoAmount !== transaction.amount) {
        transaction.status = 'REJECTED';
        transaction.adminNote = `Amount mismatch: expected ${transaction.amount}, got ${momoAmount}`;
        await transaction.save();
        return res.status(400).json({ error: 'Amount mismatch' });
      }

      transaction.status = 'COMPLETED';
      transaction.momoTransId = String(transId);
      transaction.processedAt = new Date();

      const io = req.app.get('io');

      if (transaction.type === 'TOPUP') {
        // Nạp tiền vào ví
        const updatedUser = await User.findByIdAndUpdate(
          transaction.userId,
          { $inc: { balance: transaction.amount } },
          { new: true }
        );
        transaction.adminNote = `MoMo xác nhận thành công. Balance mới: ${updatedUser?.balance}`;
        await transaction.save();

        if (io) {
          io.to(`user:${transaction.userId}`).emit('notification', {
            title: 'Nạp tiền thành công! 🎉',
            message: `Đã nạp ${transaction.amount.toLocaleString('vi-VN')}đ qua MoMo`
          });
          io.to(`user:${transaction.userId}`).emit('balance:update', {
            balance: updatedUser?.balance
          });
        }
      } else if (transaction.type === 'SPEND' && transaction.bookingMeta?.eventId) {
        // Mua vé sự kiện
        transaction.adminNote = `MoMo xác nhận thanh toán vé thành công.`;
        await transaction.save();
        await completeBooking(transaction, io);
      }

      console.log(`✅ MoMo IPN: Transaction ${orderId} completed`);
    } else {
      transaction.status = 'REJECTED';
      transaction.adminNote = `MoMo: ${ipnData.message} (resultCode: ${resultCode})`;
      await transaction.save();
      console.log(`❌ MoMo IPN: Payment failed for ${orderId}, code: ${resultCode}`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('MoMo IPN Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/payment/momo/return
 * Xử lý khi user redirect về từ MoMo
 */
export const momoReturn = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const transaction = await Transaction.findOne({ momoOrderId: orderId });
    if (!transaction) {
      return res.status(404).json({ error: 'Giao dịch không tồn tại' });
    }

    // Nếu đã xong → trả kết quả
    if (transaction.status === 'COMPLETED') {
      const user = await User.findById(transaction.userId).select('balance');
      const isBooking = transaction.type === 'SPEND' && transaction.bookingMeta?.eventId;
      return res.json({
        status: 'COMPLETED',
        type: transaction.type,
        message: isBooking
          ? `Mua ${transaction.bookingMeta.quantity} vé "${transaction.bookingMeta.eventTitle}" thành công!`
          : `Nạp ${transaction.amount.toLocaleString('vi-VN')}đ thành công!`,
        amount: transaction.amount,
        balance: user?.balance || 0,
        momoTransId: transaction.momoTransId,
        bookingMeta: transaction.bookingMeta || null,
      });
    }

    if (transaction.status === 'REJECTED') {
      return res.json({
        status: 'REJECTED',
        type: transaction.type,
        message: transaction.adminNote || 'Thanh toán thất bại',
        amount: transaction.amount,
      });
    }

    // Status PENDING → Query MoMo trực tiếp
    console.log('🔍 MoMo Return: Transaction still PENDING, querying MoMo...');
    const queryResult = await queryMomoTransaction(orderId);

    if (queryResult.resultCode === 0) {
      // MoMo xác nhận thành công
      const momoAmount = parseInt(queryResult.amount);
      if (momoAmount !== transaction.amount) {
        transaction.status = 'REJECTED';
        transaction.adminNote = `Amount mismatch on query: expected ${transaction.amount}, got ${momoAmount}`;
        await transaction.save();
        return res.json({
          status: 'REJECTED',
          message: 'Số tiền không khớp, giao dịch bị từ chối',
          amount: transaction.amount,
        });
      }

      transaction.status = 'COMPLETED';
      transaction.momoTransId = String(queryResult.transId || '');
      transaction.processedAt = new Date();

      const io = req.app.get('io');

      if (transaction.type === 'TOPUP') {
        const updatedUser = await User.findByIdAndUpdate(
          transaction.userId,
          { $inc: { balance: transaction.amount } },
          { new: true }
        );
        transaction.adminNote = `MoMo query xác nhận. Balance mới: ${updatedUser?.balance}`;
        await transaction.save();

        if (io) {
          io.to(`user:${transaction.userId}`).emit('balance:update', {
            balance: updatedUser?.balance
          });
        }

        return res.json({
          status: 'COMPLETED',
          type: 'TOPUP',
          message: `Nạp ${transaction.amount.toLocaleString('vi-VN')}đ thành công!`,
          amount: transaction.amount,
          balance: updatedUser?.balance || 0,
          momoTransId: transaction.momoTransId,
        });
      } else if (transaction.type === 'SPEND' && transaction.bookingMeta?.eventId) {
        transaction.adminNote = `MoMo query xác nhận thanh toán vé.`;
        await transaction.save();
        const booking = await completeBooking(transaction, io);
        const user = await User.findById(transaction.userId).select('balance');

        return res.json({
          status: 'COMPLETED',
          type: 'SPEND',
          message: `Mua ${transaction.bookingMeta.quantity} vé "${transaction.bookingMeta.eventTitle}" thành công!`,
          amount: transaction.amount,
          balance: user?.balance || 0,
          momoTransId: transaction.momoTransId,
          bookingMeta: transaction.bookingMeta,
        });
      }
    } else if (queryResult.resultCode === 1000) {
      return res.json({
        status: 'PENDING',
        type: transaction.type,
        message: 'Giao dịch đang được xử lý, vui lòng đợi...',
        amount: transaction.amount,
      });
    } else {
      transaction.status = 'REJECTED';
      transaction.adminNote = `MoMo query: ${queryResult.message} (code: ${queryResult.resultCode})`;
      await transaction.save();

      // Nếu là booking, giải phóng seat hold
      if (transaction.bookingMeta?.eventId) {
        await SeatHold.deleteMany({
          eventId: transaction.bookingMeta.eventId,
          zoneId: transaction.bookingMeta.zoneId,
          userId: transaction.userId,
        });
      }

      return res.json({
        status: 'REJECTED',
        type: transaction.type,
        message: queryResult.message || 'Thanh toán thất bại',
        amount: transaction.amount,
      });
    }
  } catch (error) {
    console.error('MoMo Return Error:', error);
    res.status(500).json({ error: 'Lỗi kiểm tra trạng thái thanh toán' });
  }
};
