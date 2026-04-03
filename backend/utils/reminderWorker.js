import cron from 'node-cron';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';

/**
 * Scheduled job to check for upcoming events and notify users.
 * Runs every hour.
 */
export const initReminderWorker = () => {
  console.log('⏰ Reminder Worker initialized');

  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🔍 Checking for upcoming event reminders...');
    try {
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const next25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find events starting in the 24h - 25h window
      const upcomingEvents = await Event.find({
        startDate: { $gte: next24h, $lt: next25h },
        status: 'PUBLISHED'
      });

      for (const event of upcomingEvents) {
        // Find all confirmed registrations for this event
        const registrations = await Registration.find({
          eventId: event._id,
          status: 'CONFIRMED'
        });

        for (const reg of registrations) {
          // Check if notification already exists to avoid duplicates
          const exists = await Notification.findOne({
            userId: reg.userId,
            link: `/events/${event._id}`,
            type: 'EVENT_UPDATE',
            title: { $regex: 'Sắp diễn ra' }
          });

          if (!exists) {
            await Notification.create({
              userId: reg.userId,
              title: `🔔 Sự kiện sắp diễn ra: ${event.title}`,
              message: `Đừng quên! Sự kiện "${event.title}" sẽ bắt đầu vào lúc ${new Date(event.startDate).toLocaleTimeString('vi-VN')} ngày mai.`,
              type: 'EVENT_UPDATE',
              link: `/events/${event._id}`
            });
            console.log(`✅ Sent reminder to ${reg.userEmail} for event ${event.title}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in reminder worker:', error);
    }
  });
};
