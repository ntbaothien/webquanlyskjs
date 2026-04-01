import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import Coupon from '../models/Coupon.js';
import { generateTicketCode } from '../utils/generateTicketCode.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Registration.deleteMany({}),
      Booking.deleteMany({}),
      Ticket.deleteMany({}),
      Review.deleteMany({}),
      Notification.deleteMany({}),
      Coupon.deleteMany({})
    ]);
    console.log('🗑️  Cleared all collections');

    // ---------- USERS ----------
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);

    const users = await User.insertMany([
      { fullName: 'Admin System', email: 'admin@eventhub.vn', password: hash, role: 'ADMIN', balance: 10000000 },
      { fullName: 'Nguyễn Văn Organizer', email: 'organizer@eventhub.vn', password: hash, role: 'ORGANIZER', balance: 5000000 },
      { fullName: 'Trần Thị Organizer', email: 'organizer2@eventhub.vn', password: hash, role: 'ORGANIZER', balance: 3000000 },
      { fullName: 'Lê Văn Attendee', email: 'attendee@eventhub.vn', password: hash, role: 'ATTENDEE', balance: 2000000 },
      { fullName: 'Phạm Thị User', email: 'user@eventhub.vn', password: hash, role: 'ATTENDEE', balance: 1500000 },
      { fullName: 'Hoàng Minh', email: 'minh@eventhub.vn', password: hash, role: 'ATTENDEE', balance: 800000 },
      { fullName: 'Đỗ Thanh Hà', email: 'ha@eventhub.vn', password: hash, role: 'ATTENDEE', balance: 1200000 },
      { fullName: 'Vũ Đức Anh', email: 'anh@eventhub.vn', password: hash, role: 'ATTENDEE', balance: 500000 },
    ]);
    console.log(`👥 Created ${users.length} users`);

    const admin = users[0];
    const org1 = users[1];
    const org2 = users[2];
    const att1 = users[3];
    const att2 = users[4];
    const att3 = users[5];
    const att4 = users[6];

    // ---------- EVENTS ----------
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const events = await Event.insertMany([
      {
        title: 'Đêm Nhạc Acoustic Sài Gòn',
        description: 'Một đêm nhạc acoustic ấm áp với các nghệ sĩ indie nổi tiếng tại Sài Gòn. Chương trình bao gồm các tiết mục solo guitar, duo và band session. Đặc biệt có phần giao lưu với nghệ sĩ.',
        location: 'Nhà Văn Hoá Thanh Niên, TP.HCM',
        startDate: new Date(now.getTime() + 7 * dayMs),
        endDate: new Date(now.getTime() + 7 * dayMs + 4 * 60 * 60000),
        maxCapacity: 200,
        currentAttendees: 156,
        status: 'PUBLISHED',
        tags: ['music', 'acoustic', 'entertainment'],
        category: 'MUSIC',
        free: false,
        isFeatured: true,
        organizerId: org1._id,
        organizerName: org1.fullName,
        seatZones: [
          { name: 'VIP', description: 'Hàng ghế đầu, gần sân khấu', color: '#FFD700', totalSeats: 50, soldSeats: 42, price: 500000 },
          { name: 'Standard', description: 'Khu vực giữa', color: '#4FC3F7', totalSeats: 100, soldSeats: 78, price: 200000 },
          { name: 'Economy', description: 'Khu vực phía sau', color: '#81C784', totalSeats: 50, soldSeats: 36, price: 100000 }
        ]
      },
      {
        title: 'Workshop: AI & Machine Learning cho người mới',
        description: 'Workshop thực hành về AI và Machine Learning dành cho người mới bắt đầu. Bạn sẽ học cách sử dụng Python, TensorFlow và xây dựng model đầu tiên. Yêu cầu mang laptop.',
        location: 'Trung tâm CNTT, Đại học Bách Khoa Hà Nội',
        startDate: new Date(now.getTime() + 3 * dayMs),
        endDate: new Date(now.getTime() + 3 * dayMs + 6 * 60 * 60000),
        maxCapacity: 80,
        currentAttendees: 65,
        status: 'PUBLISHED',
        tags: ['workshop', 'technology', 'AI'],
        category: 'WORKSHOP',
        free: true,
        isFeatured: true,
        organizerId: org1._id,
        organizerName: org1.fullName
      },
      {
        title: 'Giải Chạy Bộ Mùa Xuân 2026',
        description: 'Giải chạy bộ từ thiện mùa xuân với 3 cự ly: 5km, 10km và 21km Half Marathon. Mọi lứa tuổi đều tham gia được. Có huy chương và áo finisher cho tất cả.',
        location: 'Công viên Yên Sở, Hoàng Mai, Hà Nội',
        startDate: new Date(now.getTime() + 14 * dayMs),
        endDate: new Date(now.getTime() + 14 * dayMs + 5 * 60 * 60000),
        maxCapacity: 500,
        currentAttendees: 320,
        status: 'PUBLISHED',
        tags: ['sports', 'running', 'charity'],
        category: 'SPORTS',
        free: false,
        isFeatured: true,
        organizerId: org2._id,
        organizerName: org2.fullName,
        seatZones: [
          { name: '5km Fun Run', description: 'Cự ly 5km phù hợp mọi lứa tuổi', color: '#81C784', totalSeats: 200, soldSeats: 150, price: 150000 },
          { name: '10km', description: 'Cự ly 10km', color: '#4FC3F7', totalSeats: 200, soldSeats: 120, price: 250000 },
          { name: '21km Half Marathon', description: 'Half Marathon cho runner chuyên nghiệp', color: '#FFD700', totalSeats: 100, soldSeats: 50, price: 400000 }
        ]
      },
      {
        title: 'Lễ Hội Ẩm Thực Đường Phố',
        description: 'Lễ hội ẩm thực đường phố lớn nhất năm với hơn 50 gian hàng ẩm thực từ khắp 3 miền. Có khu vực biểu diễn nấu ăn trực tiếp và cuộc thi ẩm thực.',
        location: 'Phố đi bộ Nguyễn Huệ, Quận 1, TP.HCM',
        startDate: new Date(now.getTime() + 5 * dayMs),
        endDate: new Date(now.getTime() + 7 * dayMs),
        maxCapacity: 0,
        currentAttendees: 450,
        status: 'PUBLISHED',
        tags: ['food', 'festival', 'entertainment'],
        category: 'FOOD',
        free: true,
        isFeatured: false,
        organizerId: org2._id,
        organizerName: org2.fullName
      },
      {
        title: 'Triển Lãm Nghệ Thuật Đương Đại',
        description: 'Triển lãm tranh và điêu khắc đương đại của 20 nghệ sĩ trẻ Việt Nam. Chủ đề: "Hà Nội trong tôi". Free entrance, đóng góp tùy tâm.',
        location: 'Bảo tàng Mỹ Thuật Việt Nam, Ba Đình, Hà Nội',
        startDate: new Date(now.getTime() + 2 * dayMs),
        endDate: new Date(now.getTime() + 10 * dayMs),
        maxCapacity: 100,
        currentAttendees: 42,
        status: 'PUBLISHED',
        tags: ['art', 'exhibition', 'culture'],
        category: 'ART',
        free: true,
        organizerId: org1._id,
        organizerName: org1.fullName
      },
      {
        title: 'Hội Thảo: Khởi Nghiệp Trong Kỷ Nguyên Số',
        description: 'Hội thảo quy mô lớn với sự tham gia của các CEO startup unicorn Việt Nam. Các chủ đề: gọi vốn, xây dựng team, product-market fit, growth hacking.',
        location: 'Gem Center, Quận 1, TP.HCM',
        startDate: new Date(now.getTime() + 10 * dayMs),
        endDate: new Date(now.getTime() + 10 * dayMs + 8 * 60 * 60000),
        maxCapacity: 300,
        currentAttendees: 180,
        status: 'PUBLISHED',
        tags: ['conference', 'startup', 'business'],
        category: 'CONFERENCE',
        free: false,
        isFeatured: true,
        organizerId: org1._id,
        organizerName: org1.fullName,
        seatZones: [
          { name: 'VIP', description: 'Ghế VIP + networking lunch', color: '#FFD700', totalSeats: 50, soldSeats: 45, price: 1000000 },
          { name: 'Premium', description: 'Ghế Premium + tài liệu', color: '#CE93D8', totalSeats: 100, soldSeats: 75, price: 500000 },
          { name: 'Standard', description: 'Ghế thường', color: '#4FC3F7', totalSeats: 150, soldSeats: 60, price: 200000 }
        ]
      },
      {
        title: 'Ngày Hội Tình Nguyện Xanh',
        description: 'Ngày hội tình nguyện trồng cây và dọn dẹp vệ sinh ven sông. Hoạt động ý nghĩa kết hợp team building. Có áo đồng phục và lunchbox.',
        location: 'Bờ sông Sài Gòn, Quận 2, TP.HCM',
        startDate: new Date(now.getTime() + 1 * dayMs),
        endDate: new Date(now.getTime() + 1 * dayMs + 5 * 60 * 60000),
        maxCapacity: 150,
        currentAttendees: 130,
        status: 'PUBLISHED',
        tags: ['community', 'volunteer', 'environment'],
        category: 'COMMUNITY',
        free: true,
        organizerId: org2._id,
        organizerName: org2.fullName
      },
      {
        title: 'Live Concert: Sơn Tùng MTP – Sky Tour 2026',
        description: 'Concert hoành tráng nhất năm của Sơn Tùng MTP. Hệ thống âm thanh, ánh sáng đẳng cấp quốc tế. Special guests sẽ được tiết lộ trong đêm diễn.',
        location: 'SVĐ Mỹ Đình, Hà Nội',
        startDate: new Date(now.getTime() + 30 * dayMs),
        endDate: new Date(now.getTime() + 30 * dayMs + 4 * 60 * 60000),
        maxCapacity: 5000,
        currentAttendees: 4200,
        status: 'PUBLISHED',
        tags: ['music', 'concert', 'entertainment'],
        category: 'MUSIC',
        free: false,
        isFeatured: true,
        organizerId: org1._id,
        organizerName: org1.fullName,
        seatZones: [
          { name: 'SVIP', description: 'Sân khấu gần nhất + Meet & Greet', color: '#FFD700', totalSeats: 200, soldSeats: 200, price: 3000000 },
          { name: 'VIP', description: 'Khu VIP có ghế ngồi', color: '#CE93D8', totalSeats: 800, soldSeats: 750, price: 1500000 },
          { name: 'GA Standing', description: 'Khu đứng General Admission', color: '#4FC3F7', totalSeats: 2000, soldSeats: 1800, price: 800000 },
          { name: 'GA Seated', description: 'Khu ngồi phía sau', color: '#81C784', totalSeats: 2000, soldSeats: 1450, price: 500000 }
        ]
      },
      {
        title: 'Workshop Nhiếp Ảnh Cơ Bản',
        description: 'Học chụp ảnh từ cơ bản đến nâng cao với nhiếp ảnh gia chuyên nghiệp. Thực hành outdoor tại phố cổ Hà Nội. Mang máy ảnh hoặc điện thoại.',
        location: 'Phố Cổ Hà Nội',
        startDate: new Date(now.getTime() + 4 * dayMs),
        endDate: new Date(now.getTime() + 4 * dayMs + 3 * 60 * 60000),
        maxCapacity: 30,
        currentAttendees: 28,
        status: 'PUBLISHED',
        tags: ['workshop', 'photography', 'art'],
        category: 'WORKSHOP',
        free: true,
        organizerId: org2._id,
        organizerName: org2.fullName
      },
      {
        title: 'Hackathon: Build for Vietnam 2026',
        description: '48h hackathon với chủ đề giải quyết các vấn đề xã hội Việt Nam bằng công nghệ. Giải thưởng tổng trị giá 100 triệu VNĐ. Bao ăn, ngủ tại chỗ.',
        location: 'VNPT Hub, Quận 3, TP.HCM',
        startDate: new Date(now.getTime() + 20 * dayMs),
        endDate: new Date(now.getTime() + 22 * dayMs),
        maxCapacity: 200,
        currentAttendees: 95,
        status: 'PUBLISHED',
        tags: ['workshop', 'technology', 'hackathon'],
        category: 'WORKSHOP',
        free: true,
        isFeatured: false,
        organizerId: org1._id,
        organizerName: org1.fullName
      },
      // A past event (for review testing)
      {
        title: 'Tech Meetup: React & Node.js',
        description: 'Buổi meetup chia sẻ kinh nghiệm về React 19 và Node.js. Có 3 speaker và phần Q&A. Đã kết thúc.',
        location: 'WeWork, Quận 1, TP.HCM',
        startDate: new Date(now.getTime() - 10 * dayMs),
        endDate: new Date(now.getTime() - 10 * dayMs + 3 * 60 * 60000),
        maxCapacity: 60,
        currentAttendees: 55,
        status: 'PUBLISHED',
        tags: ['workshop', 'technology', 'meetup'],
        category: 'WORKSHOP',
        free: true,
        organizerId: org1._id,
        organizerName: org1.fullName
      },
      // Draft event
      {
        title: '[DRAFT] Music Festival Mùa Hè',
        description: 'Coming soon...',
        location: 'Đà Nẵng',
        startDate: new Date(now.getTime() + 60 * dayMs),
        maxCapacity: 1000,
        status: 'DRAFT',
        tags: ['music', 'festival'],
        category: 'MUSIC',
        free: false,
        organizerId: org2._id,
        organizerName: org2.fullName,
        seatZones: [
          { name: 'GA', color: '#4FC3F7', totalSeats: 1000, soldSeats: 0, price: 300000 }
        ]
      }
    ]);
    console.log(`📅 Created ${events.length} events`);

    // ---------- REGISTRATIONS (for free events) ----------
    const freeEvents = events.filter(e => e.free && e.status === 'PUBLISHED');
    const registrations = [];

    for (const event of freeEvents.slice(0, 4)) {
      for (const att of [att1, att2, att3, att4]) {
        const reg = await Registration.create({
          userId: att._id,
          userFullName: att.fullName,
          userEmail: att.email,
          eventId: event._id,
          eventTitle: event.title
        });
        registrations.push(reg);

        // Create ticket for each registration
        await Ticket.create({
          registrationId: reg._id,
          eventId: event._id,
          eventTitle: event.title,
          userId: att._id,
          userFullName: att.fullName,
          ticketCode: generateTicketCode(),
          zoneName: 'General',
          eventDate: event.startDate
        });
      }
    }
    console.log(`🎟️  Created ${registrations.length} registrations + tickets`);

    // ---------- BOOKINGS (for paid events) ----------
    const paidEvents = events.filter(e => !e.free && e.status === 'PUBLISHED');
    let bookingCount = 0;

    for (const event of paidEvents.slice(0, 2)) {
      const zone = event.seatZones[1]; // Standard zone
      for (const att of [att1, att2]) {
        const qty = 2;
        const booking = await Booking.create({
          userId: att._id,
          userFullName: att.fullName,
          eventId: event._id,
          eventTitle: event.title,
          zoneId: zone._id.toString(),
          zoneName: zone.name,
          quantity: qty,
          pricePerSeat: zone.price,
          totalPrice: zone.price * qty
        });

        for (let i = 0; i < qty; i++) {
          await Ticket.create({
            bookingId: booking._id,
            eventId: event._id,
            eventTitle: event.title,
            userId: att._id,
            userFullName: att.fullName,
            ticketCode: generateTicketCode(),
            zoneName: zone.name,
            eventDate: event.startDate
          });
        }
        bookingCount++;
      }
    }
    console.log(`💳 Created ${bookingCount} bookings + tickets`);

    // ---------- REVIEWS (for past event) ----------
    const pastEvent = events.find(e => e.endDate && e.endDate < now);
    if (pastEvent) {
      await Review.insertMany([
        { userId: att1._id, userFullName: att1.fullName, eventId: pastEvent._id, rating: 5, comment: 'Sự kiện rất tuyệt vời! Học được rất nhiều kiến thức mới về React 19.' },
        { userId: att2._id, userFullName: att2.fullName, eventId: pastEvent._id, rating: 4, comment: 'Nội dung hay, speaker giỏi. Chỉ tiếc là hơi ngắn, mong có thêm phần thực hành.' },
        { userId: att3._id, userFullName: att3.fullName, eventId: pastEvent._id, rating: 5, comment: 'Tổ chức chuyên nghiệp, địa điểm đẹp. Chắc chắn sẽ tham gia lần sau!' },
      ]);
      console.log('⭐ Created 3 reviews');
    }

    // ---------- NOTIFICATIONS ----------
    await Notification.insertMany([
      { userId: att1._id, title: 'Chào mừng!', message: 'Chào mừng bạn đến với EventHub! Khám phá các sự kiện hấp dẫn.', type: 'SYSTEM' },
      { userId: att1._id, title: 'Đăng ký thành công', message: `Bạn đã đăng ký thành công sự kiện "${freeEvents[0]?.title}"`, type: 'REGISTRATION' },
      { userId: att2._id, title: 'Chào mừng!', message: 'Chào mừng bạn đến với EventHub!', type: 'SYSTEM' },
    ]);
    console.log('🔔 Created notifications');

    // ---------- COUPONS ----------
    await Coupon.insertMany([
      {
        code: 'WELCOME2026',
        description: 'Chào mừng thành viên mới',
        discountType: 'PERCENT',
        discountValue: 10,
        maxUses: 100,
        usedCount: 12,
        maxDiscount: 200000,
        validFrom: new Date(),
        validTo: new Date(now.getTime() + 90 * dayMs),
        isActive: true
      },
      {
        code: 'EVENTHUB50K',
        description: 'Giảm 50K cho mọi sự kiện',
        discountType: 'FIXED',
        discountValue: 50000,
        maxUses: 200,
        usedCount: 45,
        minOrderAmount: 200000,
        validFrom: new Date(),
        validTo: new Date(now.getTime() + 60 * dayMs),
        isActive: true
      },
      {
        code: 'VIP20',
        description: 'Giảm 20% cho vé VIP',
        discountType: 'PERCENT',
        discountValue: 20,
        maxUses: 50,
        usedCount: 8,
        maxDiscount: 500000,
        minOrderAmount: 500000,
        validFrom: new Date(),
        validTo: new Date(now.getTime() + 30 * dayMs),
        isActive: true
      },
      {
        code: 'EXPIRED2025',
        description: 'Mã đã hết hạn (demo)',
        discountType: 'FIXED',
        discountValue: 100000,
        maxUses: 10,
        usedCount: 10,
        validFrom: new Date(now.getTime() - 60 * dayMs),
        validTo: new Date(now.getTime() - 1 * dayMs),
        isActive: false
      }
    ]);
    console.log('🎁 Created 4 sample coupons');

    console.log('\n✅ ===== SEED COMPLETED =====');
    console.log('\n📋 Test accounts (password: 123456):');
    console.log('   Admin:     admin@eventhub.vn');
    console.log('   Organizer: organizer@eventhub.vn');
    console.log('   Attendee:  attendee@eventhub.vn');
    console.log('   User:      user@eventhub.vn');
    console.log('\n🎁 Test coupons: WELCOME2026, EVENTHUB50K, VIP20\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
