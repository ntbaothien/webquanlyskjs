import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import EventReminder from '../models/EventReminder.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import { sendEventReminderEmail } from '../utils/mailer.js';

/**
 * GET /api/reminders/events/:eventId
 * Lấy lịch sử emails gửi cho event
 */
export const getEmailHistory = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const reminders = await EventReminder.find({ eventId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EventReminder.countDocuments({ eventId });

    res.json({
      content: reminders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/reminders/events/:eventId/stats
 * Lấy thống kê emails
 */
export const getReminderStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const stats = await EventReminder.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSent = stats.find(s => s._id === 'sent')?.count || 0;
    const totalFailed = stats.find(s => s._id === 'failed')?.count || 0;
    const total = totalSent + totalFailed;
    const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;

    res.json({
      totalSent,
      totalFailed,
      successRate,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/reminders/events/:eventId/send
 * Organizer gửi email reminder thủ công
 */
export const sendManualReminder = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    // Verify event exists và user là organizer
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Sự kiện không tìm thấy' });
    }

    if (event.organizerId.toString() !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Bạn không có quyền' });
    }

    // Lấy tất cả attendees (registrations + bookings)
    const registrations = await Registration.find({ eventId }).select('userId');
    const bookings = await Booking.find({ eventId }).select('userId');

    const userIds = [
      ...registrations.map(r => r.userId),
      ...bookings.map(b => b.userId)
    ];

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];

    // Get user emails
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('email fullName');

    let successCount = 0;
    let failureCount = 0;

    // Send emails
    for (const user of users) {
      try {
        await sendEventReminderEmail(user.email, event, user.fullName);

        // Log reminder
        await EventReminder.create({
          eventId,
          attendeeId: user._id,
          attendeeEmail: user.email,
          attendeeFullName: user.fullName,
          reminderType: 'manual',
          status: 'sent',
          sentAt: new Date()
        });

        successCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError.message);
        failureCount++;

        // Log failure
        await EventReminder.create({
          eventId,
          attendeeId: user._id,
          attendeeEmail: user.email,
          attendeeFullName: user.fullName,
          reminderType: 'manual',
          status: 'failed',
          failureReason: emailError.message
        });
      }
    }

    res.json({
      message: `Gửi thành công ${successCount}, thất bại ${failureCount}`,
      successCount,
      failureCount,
      totalAttempts: users.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/reminders/summary
 * Dashboard tổng overview cho organizer
 */
export const getReminderSummary = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Get all organizer's events
    const events = await Event.find({ organizerId: userId }).select('_id');
    const eventIds = events.map(e => e._id);

    // Stats
    const totalReminders = await EventReminder.countDocuments({
      eventId: { $in: eventIds }
    });

    const sentCount = await EventReminder.countDocuments({
      eventId: { $in: eventIds },
      status: 'sent'
    });

    const failedCount = await EventReminder.countDocuments({
      eventId: { $in: eventIds },
      status: 'failed'
    });

    res.json({
      totalReminders,
      sentCount,
      failedCount,
      successRate: totalReminders > 0 ? ((sentCount / totalReminders) * 100).toFixed(2) + '%' : '0%'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
