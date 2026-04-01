# 📋 Danh sách chức năng EventHub — Đầy đủ

**Tổng cộng: 55 chức năng** | Cập nhật: 01/04/2026

---

## 🔐 I. XÁC THỰC (Authentication)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 1 | Đăng ký tài khoản | `/register` | `POST /api/auth/register` | ✅ |
| 2 | Đăng nhập | `/login` | `POST /api/auth/login` | ✅ |
| 3 | Đăng xuất | Navbar button | Client-side (clear token) | ✅ |
| 4 | Phân quyền (ATTENDEE/ORGANIZER/ADMIN) | Route Guards | JWT middleware | ✅ |
| 5 | Kiểm tra tài khoản bị khóa | Login check | `isLocked` field | ✅ |

---

## 🔍 II. KHÁM PHÁ SỰ KIỆN (Event Discovery)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 6 | Trang chủ — danh sách sự kiện (phân trang) | `/` | `GET /api/events` | ✅ |
| 7 | Hero Banner (carousel tự động) | `/` component | `GET /api/events/featured` | ✅ |
| 8 | Trending Section (sự kiện nổi bật) | `/` component | `GET /api/events/trending` | ✅ |
| 9 | Category Bar (lọc theo danh mục) | `/` component | `GET /api/events/tags` | ✅ |
| 10 | Tìm kiếm theo từ khóa | Filter bar | `?keyword=...` | ✅ |
| 11 | Lọc theo địa điểm | Filter select | `GET /api/events/locations` | ✅ |
| 12 | Lọc nhanh theo thời gian (Hôm nay/Cuối tuần/Tháng này) | Quick filters | URL params | ✅ |
| 13 | Hiển thị Active Filters (chip xóa được) | Active filters bar | Client-side | ✅ |
| 14 | Phân trang sự kiện | Pagination | Server-side paginate | ✅ |
| 15 | Badge HOT (>80% capacity) | Event card | Client-side calc | ✅ |
| 16 | Countdown nhỏ trên card (Còn X ngày) | Event card | Client-side calc | ✅ |
| 17 | Skeleton loading | Loading state | — | ✅ |

---

## 📄 III. CHI TIẾT SỰ KIỆN (Event Detail)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 18 | Xem chi tiết sự kiện | `/events/:id` | `GET /api/events/:id` | ✅ |
| 19 | ⏳ Countdown timer (Ngày/Giờ/Phút/Giây) | EventDetail sidebar | Client-side `useCountdown` | ✅ |
| 20 | 📅 Google Calendar integration | Button link | Client-side URL gen | ✅ |
| 21 | ❤️ Lưu sự kiện yêu thích | Toggle button | `POST /api/users/me/saved/:id` | ✅ |
| 22 | 📢 Share — Facebook | Share button | Client-side URL | ✅ |
| 23 | 📢 Share — Twitter/X | Share button | Client-side URL | ✅ |
| 24 | 📢 Share — Telegram | Share button | Client-side URL | ✅ |
| 25 | 📢 Share — Copy link | Share button | Clipboard API | ✅ |
| 26 | 🎯 Sự kiện tương tự | Bottom section | `GET /api/events/:id/similar` | ✅ |
| 27 | Hiển thị khu vực ghế & giá vé | Seat zone cards | Event data | ✅ |
| 28 | Đăng ký sự kiện miễn phí | Register button | `POST /api/events/:id/register` | ✅ |
| 29 | ⭐ Đánh giá & nhận xét (1-5 sao) | Review section | `POST /api/events/:id/reviews` | ✅ |
| 30 | Xem danh sách đánh giá | Review list | `GET /api/events/:id/reviews` | ✅ |
| 31 | Banner ảnh sự kiện | Image display | File upload | ✅ |

---

## 🎫 IV. ĐẶT VÉ & THANH TOÁN (Booking)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 32 | Chọn khu vực ghế (zone) | `/events/:id/book` | Event seatZones | ✅ |
| 33 | Chọn số lượng vé | BookingPage | Client-side | ✅ |
| 34 | Thanh toán mô phỏng (trừ số dư) | BookingPage | `POST /api/events/:id/book` | ✅ |
| 35 | Progress bar hiện trạng ghế | BookingPage | Zone soldSeats/totalSeats | ✅ |
| 36 | 🎁 Nhập mã giảm giá (coupon) | Coupon input | `POST /api/coupons/validate` | ✅ |
| 37 | Hiển thị bảng giá chi tiết (Tạm tính/Giảm/Tổng) | Price breakdown | Client-side calc | ✅ |

---

## 📩 V. VÉ ĐIỆN TỬ & CHECK-IN (QR Ticket)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 38 | Xem danh sách vé đã đặt | `/my-registrations` | `GET /api/my-registrations` + `GET /api/my-bookings` | ✅ |
| 39 | Tab lọc vé (Tất cả/Miễn phí/Có phí) | Tabs filter | Client-side | ✅ |
| 40 | Hủy đăng ký sự kiện | Cancel button | `DELETE /api/registrations/:id` | ✅ |
| 41 | Hủy booking & hoàn tiền | Cancel button | `DELETE /api/bookings/:id` | ✅ |
| 42 | 📩 Xem vé QR Code | `/tickets/:code` | `GET /api/tickets/:code` | ✅ |
| 43 | 📥 Tải vé PNG | Download button | `html2canvas` | ✅ |
| 44 | 🔐 Quét QR Check-in (camera) | `/organizer/check-in` | `POST /api/tickets/:code/check-in` | ✅ |
| 45 | 🔐 Nhập mã vé thủ công | Check-in manual | Same API | ✅ |
| 46 | Thống kê check-in (Thành công/Lỗi) | Check-in stats | Client-side count | ✅ |

---

## 🎁 VI. MÃ GIẢM GIÁ (Coupon System)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 47 | Tạo mã giảm giá (PERCENT/FIXED) | `/admin/coupons` | `POST /api/coupons` | ✅ |
| 48 | Xem danh sách coupon | `/admin/coupons` | `GET /api/coupons` | ✅ |
| 49 | Xóa coupon | Delete button | `DELETE /api/coupons/:id` | ✅ |
| 50 | Validate coupon | Booking page | `POST /api/coupons/validate` | ✅ |
| 51 | Sử dụng coupon (use count++) | After booking | `POST /api/coupons/use` | ✅ |

---

## 👤 VII. HỒ SƠ CÁ NHÂN (Profile)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 52 | Xem hồ sơ cá nhân | `/profile` | `GET /api/users/me` | ✅ |
| 53 | Chỉnh sửa thông tin (tên, avatar) | Profile form | `PUT /api/users/me` | ✅ |
| 54 | Đổi mật khẩu | Password form | `PUT /api/users/me/password` | ✅ |
| 55 | Xem số dư tài khoản | Profile page | `balance` field | ✅ |
| 56 | Thống kê cá nhân (sự kiện đã tham gia) | Stats section | `GET /api/users/me/stats` | ✅ |
| 57 | Xem sự kiện đã lưu | `/profile/saved` | `GET /api/users/me/saved` | ✅ |

---

## 📋 VIII. QUẢN LÝ SỰ KIỆN — ORGANIZER

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 58 | Xem sự kiện của tôi (phân trang) | `/organizer/my-events` | `GET /api/organizer/my-events` | ✅ |
| 59 | Tạo sự kiện mới (multipart form) | `/organizer/events/create` | `POST /api/organizer/events` | ✅ |
| 60 | Chỉnh sửa sự kiện | `/organizer/events/:id/edit` | `PUT /api/organizer/events/:id` | ✅ |
| 61 | Xóa/Hủy sự kiện | Delete button | `DELETE /api/organizer/events/:id` | ✅ |
| 62 | Upload ảnh banner sự kiện | Form file input | Multer middleware | ✅ |
| 63 | Cấu hình khu vực ghế & giá | Zone JSON builder | `seatZones` field | ✅ |
| 64 | Xem danh sách đăng ký/booking | Registrations tab | `GET /api/organizer/events/:id/registrations` | ✅ |

---

## 🛡️ IX. QUẢN TRỊ HỆ THỐNG — ADMIN

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 65 | Dashboard tổng quan (stats + charts) | `/admin` | `GET /api/admin/dashboard` | ✅ |
| 66 | Quản lý người dùng (CRUD + tìm kiếm) | `/admin/users` | `GET /api/admin/users` | ✅ |
| 67 | Khóa/Mở khóa tài khoản | Toggle button | `POST /api/admin/users/:id/toggle` | ✅ |
| 68 | Đổi Role người dùng | Role select | `POST /api/admin/users/:id/role` | ✅ |
| 69 | Quản lý sự kiện (toàn hệ thống) | `/admin/events` | `GET /api/admin/events` | ✅ |
| 70 | Duyệt/Thay đổi trạng thái sự kiện | Status toggle | `PUT /api/admin/events/:id` | ✅ |
| 71 | Xóa sự kiện | Delete button | `DELETE /api/admin/events/:id` | ✅ |
| 72 | Xem chi tiết đăng ký/booking từng sự kiện | Detail modal | `GET /api/admin/events/:id/registrations` | ✅ |
| 73 | Báo cáo doanh thu | `/admin/reports` | `GET /api/admin/revenue` | ✅ |
| 74 | Báo cáo thống kê (sự kiện theo tháng, user theo role) | `/admin/reports` | `GET /api/admin/reports` | ✅ |
| 75 | Quản lý mã giảm giá | `/admin/coupons` | `GET/POST/DELETE /api/coupons` | ✅ |

---

## 🔔 X. THÔNG BÁO (Notifications)

| # | Chức năng | Route Frontend | API Backend | Trạng thái |
|---|-----------|---------------|-------------|------------|
| 76 | Xem thông báo | Notification panel | `GET /api/notifications` | ✅ |
| 77 | Đánh dấu đã đọc | Mark read | `PUT /api/notifications/:id/read` | ✅ |
| 78 | Đánh dấu tất cả đã đọc | Mark all | `PUT /api/notifications/read-all` | ✅ |

---

## ⚙️ XI. HỆ THỐNG & UI

| # | Chức năng | Mô tả | Trạng thái |
|---|-----------|-------|------------|
| 79 | Responsive Navbar (hamburger menu) | Mobile-friendly navigation | ✅ |
| 80 | Toast notification (success/error) | Global feedback system | ✅ |
| 81 | Footer đầy đủ | Links, copyright | ✅ |
| 82 | 404 Not Found page | Error handling | ✅ |
| 83 | Socket.IO real-time (cơ bản) | Server + client setup | ✅ |
| 84 | Dark mode theme | Toàn ứng dụng | ✅ |
| 85 | Seed data (12 sự kiện + users + coupons) | Database seeding script | ✅ |
| 86 | File upload (Multer) | Avatar + banner upload | ✅ |
| 87 | JWT Authentication middleware | Token-based auth | ✅ |
| 88 | Role-based access control | ATTENDEE/ORGANIZER/ADMIN guards | ✅ |

---

## 📊 Tổng kết

| Phân loại | Số chức năng |
|-----------|-------------|
| 🔐 Xác thực | 5 |
| 🔍 Khám phá sự kiện | 12 |
| 📄 Chi tiết sự kiện | 14 |
| 🎫 Đặt vé & Thanh toán | 6 |
| 📩 Vé QR & Check-in | 9 |
| 🎁 Mã giảm giá | 5 |
| 👤 Hồ sơ cá nhân | 6 |
| 📋 Organizer | 7 |
| 🛡️ Admin | 11 |
| 🔔 Thông báo | 3 |
| ⚙️ Hệ thống & UI | 10 |
| **Tổng cộng** | **88** |

---

## 🗄️ Data Models (9 models)

| Model | Mô tả |
|-------|-------|
| `User` | Tài khoản (fullName, email, password, role, balance, savedEvents) |
| `Event` | Sự kiện (title, location, dates, seatZones, category, tags) |
| `Registration` | Đăng ký sự kiện miễn phí |
| `Booking` | Đặt vé sự kiện có phí |
| `Ticket` | Vé điện tử (ticketCode, QR, check-in status) |
| `Review` | Đánh giá sự kiện (rating 1-5, comment) |
| `Coupon` | Mã giảm giá (PERCENT/FIXED, validity) |
| `Notification` | Thông báo hệ thống |
| `Order` | Đơn hàng |

## 🧩 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 19 + Vite + React Router v6 |
| State | Zustand (persist) |
| Backend | Express.js + Node.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Real-time | Socket.IO |
| QR Code | qrcode.react + html5-qrcode |
| Export | html2canvas + jspdf |
