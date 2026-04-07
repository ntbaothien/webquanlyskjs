import cron from 'node-cron';
import Event from '../models/Event.js';
import EventReminder from '../models/EventReminder.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { sendEventReminderEmail } from './mailer.js';

/**
 * Check and send reminders for events starting in 24 hours
 * Runs every hour
 */
async function checkAndSend24hReminder() {
  try {
    console.log('\n⏰ [REMINDER SERVICE] Checking for 24h reminders...');

    // Find events that:
    // 1. Start in ~24 hours (now + 23-25 hours)
    // 2. Haven't sent 24h reminder yet
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in20h = new Date(now.getTime() + 20 * 60 * 60 * 1000); // buffer

    const events = await Event.find({
      startDate: { $gte: in20h, $lte: in24h },
      'emailReminders.sent24h': false,
      status: { $ne: 'CANCELLED' }
    });

    console.log(`Found ${events.length} events for 24h reminder`);

    for (const event of events) {
      // Get attendees (registrations + bookings)
      const registrations = await Registration.find({ eventId: event._id, status: 'CONFIRMED' }).select('userId');
      const bookings = await Booking.find({ eventId: event._id, status: 'CONFIRMED' }).select('userId');

      const userIds = [
        ...registrations.map(r => r.userId),
        ...bookings.map(b => b.userId)
      ];

      // Remove duplicates
      const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];

      // Get user emails
      const users = await User.find({ _id: { $in: uniqueUserIds } }).select('email fullName');

      console.log(`  📧 Sending 24h reminder to ${users.length} attendees for event: ${event.title}`);

      let sentCount = 0;
      let failureCount = 0;

      for (const user of users) {
        try {
          await sendEventReminderEmail(user.email, event, user.fullName);

          // Log success
          await EventReminder.create({
            eventId: event._id,
            attendeeId: user._id,
            attendeeEmail: user.email,
            attendeeFullName: user.fullName,
            reminderType: '24h',
            status: 'sent',
            sentAt: new Date()
          });

          sentCount++;
        } catch (emailError) {
          console.error(`    ❌ Failed to send to ${user.email}:`, emailError.message);
          failureCount++;

          // Log failure
          await EventReminder.create({
            eventId: event._id,
            attendeeId: user._id,
            attendeeEmail: user.email,
            attendeeFullName: user.fullName,
            reminderType: '24h',
            status: 'failed',
            failureReason: emailError.message
          });
        }
      }

      // Mark event as sent
      event.emailReminders.sent24h = true;
      event.emailReminders.lastReminderSent = new Date();
      await event.save();

      console.log(`    ✅ Sent: ${sentCount}, ❌ Failed: ${failureCount}`);
    }

    console.log('✅ 24h reminder check completed\n');
  } catch (error) {
    console.error('❌ [REMINDER SERVICE] Error in checkAndSend24hReminder:', error.message);
  }
}

/**
 * Check and send reminders for events starting in 1 hour
 * Runs every 15 minutes
 */
async function checkAndSend1hReminder() {
  try {
    console.log('⏰ [REMINDER SERVICE] Checking for 1h reminders...');

    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in50min = new Date(now.getTime() + 50 * 60 * 1000);

    const events = await Event.find({
      startDate: { $gte: in50min, $lte: in1h },
      'emailReminders.sent1h': false,
      status: { $ne: 'CANCELLED' }
    });

    console.log(`Found ${events.length} events for 1h reminder`);

    for (const event of events) {
      const registrations = await Registration.find({ eventId: event._id, status: 'CONFIRMED' }).select('userId');
      const bookings = await Booking.find({ eventId: event._id, status: 'CONFIRMED' }).select('userId');

      const userIds = [
        ...registrations.map(r => r.userId),
        ...bookings.map(b => b.userId)
      ];

      const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];
      const users = await User.find({ _id: { $in: uniqueUserIds } }).select('email fullName');

      console.log(`  📧 Sending 1h reminder to ${users.length} attendees for event: ${event.title}`);

      let sentCount = 0;

      for (const user of users) {
        try {
          await sendEventReminderEmail(user.email, event, user.fullName);

          await EventReminder.create({
            eventId: event._id,
            attendeeId: user._id,
            attendeeEmail: user.email,
            attendeeFullName: user.fullName,
            reminderType: '1h',
            status: 'sent',
            sentAt: new Date()
          });

          sentCount++;
        } catch (emailError) {
          console.error(`    ❌ Failed:`, emailError.message);
        }
      }

      event.emailReminders.sent1h = true;
      event.emailReminders.lastReminderSent = new Date();
      await event.save();

      console.log(`    ✅ Sent: ${sentCount}`);
    }

    console.log('✅ 1h reminder check completed');
  } catch (error) {
    console.error('❌ [REMINDER SERVICE] Error in checkAndSend1hReminder:', error.message);
  }
}

/**
 * Start reminder scheduler
 * Runs cron jobs at specified intervals
 */
export function startReminderScheduler() {
  console.log('📧 Starting EventReminder Scheduler...');

  // 24h reminder - run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    checkAndSend24hReminder();
  });

  // 1h reminder - run every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    checkAndSend1hReminder();
  });

  console.log('✅ EventReminder Scheduler started');
  console.log('  ⏰ 24h reminders: Every hour');
  console.log('  ⏰ 1h reminders: Every 15 minutes');
}

/**
 * Manual trigger for testing (call from API)
 */
export async function triggerReminderCheck(reminderType = 'all') {
  try {
    if (reminderType === '24h' || reminderType === 'all') {
      await checkAndSend24hReminder();
    }
    if (reminderType === '1h' || reminderType === 'all') {
      await checkAndSend1hReminder();
    }
    return { success: true, message: 'Reminder check triggered' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
