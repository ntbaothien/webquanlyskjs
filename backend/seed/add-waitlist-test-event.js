import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Ticket from '../models/Ticket.js';
import { generateTicketCode } from '../utils/generateTicketCode.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Lấy organizer đầu tiên tìm được
  const organizer = await User.findOne({ role: 'ORGANIZER' });
  if (!organizer) {
    console.error('❌ Không tìm thấy tài khoản ORGANIZER trong DB. Hãy chạy seed trước.');
    process.exit(1);
  }

  // Lấy một attendee để fill 4/5 chỗ
  const attendees = await User.find({ role: 'ATTENDEE' }).limit(4);

  const now = new Date();
  const startDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 ngày sau
  const endDate   = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // + 3 giờ

  // Tạo sự kiện miễn phí, sức chứa 5, đã có 4 người → còn 1 chỗ
  const event = await Event.create({
    title: '🧪 [TEST WAITLIST] Workshop Lập Trình Fullstack',
    description: 'Đây là sự kiện dùng để test chức năng Waitlist.\n\nSức chứa 5 người, đã có 4 người đăng ký → chỉ còn 1 chỗ trống.\n\nHãy dùng tài khoản ATTENDEE để đăng ký — khi hết chỗ sẽ thấy nút "🔔 Thông báo khi có chỗ".',
    location: 'Hà Nội, Việt Nam',
    startDate,
    endDate,
    maxCapacity: 5,
    currentAttendees: 4,
    status: 'PUBLISHED',
    free: true,
    tags: ['workshop', 'lập trình'],
    category: 'WORKSHOP',
    organizerId: organizer._id,
    organizerName: organizer.fullName,
  });

  console.log(`✅ Đã tạo sự kiện: "${event.title}"`);
  console.log(`   ID: ${event._id}`);
  console.log(`   Sức chứa: ${event.maxCapacity} | Đã đăng ký: ${event.currentAttendees} | Còn lại: ${event.maxCapacity - event.currentAttendees}`);

  // Tạo đăng ký giả cho 4 attendees (để đếm đúng)
  for (let i = 0; i < Math.min(4, attendees.length); i++) {
    const att = attendees[i];
    const reg = await Registration.create({
      userId: att._id,
      userFullName: att.fullName,
      userEmail: att.email,
      eventId: event._id,
      eventTitle: event.title,
      status: 'CONFIRMED',
    });
    await Ticket.create({
      registrationId: reg._id,
      eventId: event._id,
      eventTitle: event.title,
      userId: att._id,
      userFullName: att.fullName,
      ticketCode: generateTicketCode(),
      zoneName: 'General',
      eventDate: event.startDate,
    });
    console.log(`   📝 Đã tạo đăng ký cho: ${att.fullName} (${att.email})`);
  }

  console.log('\n🔗 URL sự kiện (frontend):');
  console.log(`   http://localhost:5173/events/${event._id}`);
  console.log('\n💡 Gợi ý test:');
  console.log('   1. Đăng nhập bằng tài khoản chưa đăng ký sự kiện này');
  console.log('   2. Vào URL trên → đăng ký → chỗ sẽ đầy');
  console.log('   3. Đăng nhập tài khoản khác → vào URL → thấy nút 🔔 Waitlist');

  await mongoose.disconnect();
  console.log('\n✅ Xong!');
}

run().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
