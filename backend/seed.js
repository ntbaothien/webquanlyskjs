/**
 * Seed script — Tạo dữ liệu mẫu cho EventHub
 * Chạy: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./src/config/db');

const User = require('./src/models/User');
const Event = require('./src/models/Event');
const TicketType = require('./src/models/TicketType');
const Discount = require('./src/models/Discount');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Xóa data cũ
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    TicketType.deleteMany({}),
    Discount.deleteMany({}),
  ]);

  // ===== USERS =====
  const passwordHash = await bcrypt.hash('admin123', 12);
  const [admin, organizer, user1] = await User.insertMany([
    { fullName: 'Admin EventHub', email: 'admin@eventhub.vn', passwordHash, role: 'Admin', phone: '0901000001' },
    { fullName: 'Tran Thi Organizer', email: 'organizer@eventhub.vn', passwordHash, role: 'Organizer', phone: '0901000002' },
    { fullName: 'Nguyen Van User', email: 'user@eventhub.vn', passwordHash, role: 'User', phone: '0901000003' },
  ]);
  console.log('✅ Users created: 3');

  // ===== EVENTS =====
  const now = new Date();
  const events = await Event.insertMany([
    {
      title: 'Lễ hội Âm nhạc Mùa Hè 2026',
      description: 'Sự kiện âm nhạc lớn nhất mùa hè với hơn 20 nghệ sĩ nổi tiếng. Cùng nhau tận hưởng những giai điệu sôi động!',
      category: 'Music',
      location: 'Sân vận động Quốc gia Mỹ Đình, Hà Nội',
      latitude: 21.0285, longitude: 105.7782,
      geoLocation: { type: 'Point', coordinates: [105.7782, 21.0285] },
      startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      saleStart: now,
      saleEnd: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'],
      status: 'Published',
      languages: ['vi', 'en'],
      createdBy: organizer._id,
      viewCount: 1250,
    },
    {
      title: 'Tech Summit 2026 — Hội thảo Công nghệ',
      description: 'Hội tụ những chuyên gia hàng đầu trong lĩnh vực AI, Cloud Computing và Blockchain. Cơ hội networking tuyệt vời!',
      category: 'Conference',
      location: 'Trung tâm Hội nghị GEM Center, TP. HCM',
      latitude: 10.7769, longitude: 106.6969,
      geoLocation: { type: 'Point', coordinates: [106.6969, 10.7769] },
      startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      saleStart: now,
      saleEnd: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'],
      status: 'Published',
      createdBy: organizer._id,
      viewCount: 856,
    },
    {
      title: 'Giải Bóng đá Phong trào Mùa Xuân',
      description: 'Giải đấu thể thao cộng đồng dành cho mọi lứa tuổi. Tham gia để vận động và kết nối bạn bè!',
      category: 'Sports',
      location: 'Sân bóng Thống Nhất, TP. HCM',
      latitude: 10.7752, longitude: 106.6680,
      geoLocation: { type: 'Point', coordinates: [106.6680, 10.7752] },
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      saleStart: now,
      saleEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1560272564-c83b66b1a4c2?w=800'],
      status: 'Published',
      createdBy: organizer._id,
      viewCount: 432,
    },
    {
      title: 'Workshop Thiết kế UX/UI cho Người mới',
      description: 'Khóa học thực hành thiết kế giao diện người dùng từ A-Z. Phù hợp cho người mới bắt đầu muốn chuyển ngành.',
      category: 'Workshop',
      location: 'Không gian làm việc chung Toong, Đà Nẵng',
      latitude: 16.0544, longitude: 108.2022,
      geoLocation: { type: 'Point', coordinates: [108.2022, 16.0544] },
      startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      saleStart: now,
      saleEnd: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'],
      status: 'Published',
      createdBy: organizer._id,
      viewCount: 298,
    },
    {
      title: 'Lễ hội Ẩm thực Quốc tế Hà Nội 2026',
      description: 'Khám phá hơn 50 món ăn từ khắp nơi trên thế giới. Food stall, cooking class và food competition đặc sắc!',
      category: 'Food',
      location: 'Công viên Thống Nhất, Hà Nội',
      latitude: 21.0227, longitude: 105.8412,
      geoLocation: { type: 'Point', coordinates: [105.8412, 21.0227] },
      startTime: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000),
      saleStart: now,
      saleEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'],
      status: 'Published',
      createdBy: organizer._id,
      viewCount: 1890,
    },
    {
      title: 'Stand-up Comedy — Cười lên nào!',
      description: 'Đêm hài độc thoại với những comedian nổi tiếng nhất Việt Nam. Cười xả stress sau tuần làm việc vất vả!',
      category: 'Comedy',
      location: 'Nhà hát Lớn TP. HCM',
      latitude: 10.7797, longitude: 106.7006,
      geoLocation: { type: 'Point', coordinates: [106.7006, 10.7797] },
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      saleStart: now,
      saleEnd: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800'],
      status: 'Published',
      createdBy: organizer._id,
      viewCount: 723,
    },
  ]);
  console.log(`✅ Events created: ${events.length}`);

  // ===== TICKET TYPES =====
  const ticketData = [
    // Event 0 - Music Festival
    { eventId: events[0]._id, name: 'Vé Thường', price: 250000, quantity: 1000, description: 'Khu vực đứng, xem chung' },
    { eventId: events[0]._id, name: 'Vé VIP', price: 650000, quantity: 200, description: 'Khu VIP, có chỗ ngồi và đồ uống miễn phí' },
    { eventId: events[0]._id, name: 'Vé VVIP', price: 1200000, quantity: 50, description: 'Backstage pass, gặp gỡ nghệ sĩ' },
    // Event 1 - Conference
    { eventId: events[1]._id, name: 'Vé Tham dự', price: 500000, quantity: 300, description: 'Tham dự toàn bộ hội thảo + tài liệu' },
    { eventId: events[1]._id, name: 'Early Bird', price: 350000, quantity: 100, description: 'Ưu đãi đặc biệt cho người đăng ký sớm', sold: 78 },
    // Event 2 - Sports
    { eventId: events[2]._id, name: 'Vé Cá nhân', price: 100000, quantity: 200, description: 'Tham gia với tư cách cá nhân' },
    { eventId: events[2]._id, name: 'Vé Đội (5 người)', price: 400000, quantity: 40, description: '5 người/đội', isGroupTicket: true, groupSize: 5 },
    // Event 3 - Workshop
    { eventId: events[3]._id, name: 'Workshop Ticket', price: 800000, quantity: 30, description: 'Bao gồm tài liệu, bữa trưa và certificate' },
    // Event 4 - Food
    { eventId: events[4]._id, name: 'Vé Vào cổng', price: 50000, quantity: 5000, description: 'Vé vào cổng lễ hội (không bao gồm đồ ăn)' },
    { eventId: events[4]._id, name: 'Gói Ẩm thực', price: 200000, quantity: 1000, description: '1 vé vào cổng + 5 food voucher' },
    // Event 5 - Comedy
    { eventId: events[5]._id, name: 'Ghế Thường', price: 150000, quantity: 200 },
    { eventId: events[5]._id, name: 'Ghế VIP (hàng đầu)', price: 350000, quantity: 50 },
  ];
  await TicketType.insertMany(ticketData);
  console.log(`✅ TicketTypes created: ${ticketData.length}`);

  // ===== DISCOUNTS =====
  await Discount.insertMany([
    {
      code: 'WELCOME20',
      type: 'percent',
      value: 20,
      maxUsage: 1000,
      maxDiscountAmount: 100000,
      expiredAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      createdBy: admin._id,
    },
    {
      code: 'EARLYBIRD50K',
      type: 'fixed',
      value: 50000,
      maxUsage: 200,
      expiredAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      createdBy: admin._id,
    },
  ]);
  console.log('✅ Discounts created: 2');

  console.log('\n🎉 Seed hoàn thành!');
  console.log('📧 Tài khoản test:');
  console.log('   Admin:     admin@eventhub.vn     / admin123');
  console.log('   Organizer: organizer@eventhub.vn  / admin123');
  console.log('   User:      user@eventhub.vn       / admin123');
  console.log('\nMã giảm giá: WELCOME20 (20%), EARLYBIRD50K (50k)');

  process.exit(0);
};

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
