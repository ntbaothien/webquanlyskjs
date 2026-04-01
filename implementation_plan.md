# 🎯 Kế Hoạch Cải Thiện EventHub — Tham Khảo Ticketbox.vn

## Tổng Quan

Sau khi phân tích toàn bộ codebase hiện tại (Backend: Spring Boot + MongoDB, Frontend: React + Vite) và so sánh với [Ticketbox.vn](https://ticketbox.vn), dưới đây là kế hoạch cải thiện chi tiết, chia theo **mức độ ưu tiên**.

![Ticketbox reference recording](file:///C:/Users/acer/.gemini/antigravity/brain/255ff941-61c9-4738-9b77-12d99e817e87/ticketbox_exploration_1775013966744.webp)

---

## Đánh Giá Hiện Trạng (Cái đã có ✅)

| Thành phần | Trạng thái |
|---|---|
| Auth (JWT, Login, Register) | ✅ Hoàn thiện |
| CRUD Events (Organizer) | ✅ Hoàn thiện |
| Đăng ký sự kiện miễn phí | ✅ Hoàn thiện |
| Đặt vé có phí (SeatZone + Balance) | ✅ Cơ bản |
| Review & Rating | ✅ Cơ bản |
| Admin Dashboard + User/Event Manage | ✅ Hoàn thiện |
| Admin Reports + Revenue | ✅ Cơ bản |
| Organizer: Quản lý sự kiện + xem registrations | ✅ Hoàn thiện |
| Search + Filter (keyword, tag, location, date) | ✅ Cơ bản |
| Profile Page + Saved Events | ✅ Cơ bản |

---

## So Sánh Gap Analysis: EventHub vs Ticketbox.vn

### Cái mà Ticketbox có, EventHub thiếu/yếu

| # | Tính năng (Ticketbox) | EventHub hiện tại | Mức độ |
|---|---|---|---|
| 1 | **Hero Banner Carousel** động trên trang chủ | ❌ Chỉ có heading text tĩnh | 🔴 Cao |
| 2 | **Danh mục sự kiện (Categories)** visual trên navbar | ❌ Chỉ filter bằng tag text | 🔴 Cao |
| 3 | **Trending Events** section nổi bật | ❌ Không có | 🟡 Trung bình |
| 4 | **Quick Time Filters** (Cuối tuần, Tháng này, Hôm nay) | ❌ Chỉ có date range picker | 🟡 Trung bình |
| 5 | **Sticky "Mua vé" CTA** button trên event detail | ❌ Button không cố định | 🔴 Cao |
| 6 | **Multiple Showtimes** (nhiều ngày giờ cho 1 sự kiện) | ❌ Chỉ 1 startDate/endDate | 🟡 Trung bình |
| 7 | **Payment Gateway** (VNPay, MoMo...) | ❌ Chỉ dùng balance giả | 🔴 Cao |
| 8 | **QR Code / E-Ticket** sau khi mua vé | ❌ Không có | 🔴 Cao |
| 9 | **Check-in** cho Organizer | ❌ Không có | 🟡 Trung bình |
| 10 | ~~Social Login~~ | ~~Không cần~~ | ~~Loại bỏ~~ |
| 11 | **Share Event** (social media) | ❌ Không có | 🟢 Thấp |
| 12 | **Chính sách hoàn tiền / Điều khoản** | ❌ Không có | 🟢 Thấp |
| 13 | **Email/SMS Notification** khi đặt vé, nhắc nhở sự kiện | ❌ Không có | 🔴 Cao |
| 14 | **Footer** đầy đủ (about, policy, social links) | ❌ Không có footer | 🔴 Cao |
| 15 | **Breadcrumb Navigation** | ❌ Không có | 🟢 Thấp |
| 16 | **Map/Location integration** (Google Maps) | ❌ Chỉ text location | 🟡 Trung bình |
| 17 | **Responsive Mobile Design** tốt | ⚠️ Chưa tối ưu | 🔴 Cao |
| 18 | **Loading Skeleton / Shimmer Effect** | ❌ Chỉ có emoji text | 🟡 Trung bình |
| 19 | **404 / Error Pages** cho frontend SPA | ❌ Chỉ redirect về / | 🟡 Trung bình |
| 20 | **Đa ngôn ngữ (i18n)** | ❌ Chỉ tiếng Việt | 🟢 Thấp |

---

## Kế Hoạch Cải Thiện Chi Tiết

### Phase 1: UI/UX Polish & Core Missing Features 🔴 (Ưu tiên cao)

---

#### 1.1 Trang chủ — Hero Banner & Event Categories

**Vấn đề:** Trang chủ hiện tại chỉ có 1 heading text tĩnh "Khám phá Sự kiện", thiếu sức hút so với carousel banner của Ticketbox.

**Cần làm:**

##### [NEW] `frontend/src/components/common/HeroBanner.jsx`
- Carousel component hiển thị 3-5 sự kiện nổi bật nhất (có banner đẹp)
- Auto-slide mỗi 5 giây, có dot indicators và navigation arrows
- Click vào banner → navigate đến event detail
- CSS animation smooth (slide/fade transitions)

##### [NEW] `frontend/src/components/common/CategoryBar.jsx`
- Horizontal scrollable bar các danh mục sự kiện (Âm nhạc, Thể thao, Nghệ thuật, Workshop, Hội thảo...)
- Mỗi category có icon riêng (emoji hoặc icon library)
- Click → filter events theo category/tag
- Sticky dưới Navbar khi scroll

##### [NEW] `frontend/src/components/common/TrendingSection.jsx`
- "Sự kiện nổi bật" section với numbered cards (1, 2, 3...)
- Lấy top events theo `currentAttendees` hoặc bookings count
- Design lớn, eye-catching

##### [NEW] `frontend/src/components/common/Footer.jsx`
- Footer đầy đủ: About, Contact, Policy links
- Social media links
- Download app links (nếu có)
- Copyright

##### [MODIFY] [EventListPage.jsx](file:///d:/Documents/J2EE/frontend/src/pages/events/EventListPage.jsx)
- Tích hợp HeroBanner, CategoryBar, TrendingSection
- Thêm "Quick Time Filters": Hôm nay, Cuối tuần này, Tháng này
- Cải thiện Event Cards: thêm hiển thị giá vé (từ/miễn phí), shadow hover effect

##### Backend — Trending Events API
##### [MODIFY] [EventApiController.java](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/controller/api/EventApiController.java)
- `GET /api/events/trending` — Top 10 sự kiện nhiều đăng ký/bookings nhất
- `GET /api/events/featured` — Sự kiện được admin pin lên (cần thêm field `isFeatured` trong Event model)

##### [MODIFY] [Event.java](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/model/Event.java)
- Thêm field `boolean isFeatured = false` — Admin có thể đánh dấu sự kiện nổi bật
- Thêm field `String category` — Nhóm danh mục chính (MUSIC, SPORTS, ART, WORKSHOP, CONFERENCE, OTHER)

##### [NEW] `model/enums/EventCategory.java`
- Enum: `MUSIC, SPORTS, ART, WORKSHOP, CONFERENCE, FOOD, COMMUNITY, OTHER`

---

#### 1.2 Event Detail Page — Sticky CTA & UX cải thiện

**Vấn đề:** Ticketbox có sticky "Mua vé ngay" button khi scroll, có ticket-shaped hero design, có map tích hợp. EventHub thiếu tất cả.

**Cần làm:**

##### [MODIFY] [EventDetailPage.jsx](file:///d:/Documents/J2EE/frontend/src/pages/events/EventDetailPage.jsx)
- **Sticky CTA bar** ở bottom khi user scroll qua phần đặt vé: hiển thị giá vé + nút "Mua vé ngay" / "Đặt chỗ miễn phí"
- **Tab navigation**: "Giới thiệu | Vé & Giá | Đánh giá | Chính sách" thay vì 1 page dài
- **Share Event buttons**: Facebook, Twitter, Copy link
- **Google Maps embed** hiển thị vị trí sự kiện
- **Related Events** section ở cuối trang (cùng tag/category)
- **Organizer info card** với avatar, tên, số sự kiện đã tổ chức

##### Backend — Related Events
##### [MODIFY] [EventApiController.java](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/controller/api/EventApiController.java)
- `GET /api/events/{id}/related` — Sự kiện cùng tag/category (exclude current)

---

#### 1.3 QR Code E-Ticket System

**Vấn đề:** Sau khi mua vé, user không nhận được gì cụ thể. Ticketbox cung cấp e-ticket với QR code.

**Cần làm:**

##### Backend
##### [NEW] `model/Ticket.java`
```java
@Document(collection = "tickets")
public class Ticket {
    @Id private String id;
    private String bookingId;          // hoặc registrationId
    private String eventId;
    private String eventTitle;
    private String userId;
    private String userFullName;
    private String ticketCode;         // unique code: "EVH-XXXX-XXXX"
    private String qrCodeData;         // data encoded in QR (ticketCode)
    private String zoneName;           // zone info
    private String status;             // ACTIVE | USED | CANCELLED
    private LocalDateTime eventDate;
    private LocalDateTime createdAt;
    private LocalDateTime usedAt;      // timestamp khi check-in
}
```

##### [NEW] `service/TicketService.java` + `service/impl/TicketServiceImpl.java`
- `generateTickets(Booking booking)` — Tạo N tickets cho booking với unique codes
- `generateTickets(Registration reg)` — Tạo 1 ticket cho free registration
- `validateTicket(String ticketCode)` — Validate ticket cho check-in
- `checkIn(String ticketCode)` — Đánh dấu đã sử dụng

##### [NEW] `controller/api/TicketApiController.java`
- `GET /api/my-tickets` — Danh sách vé của user
- `GET /api/tickets/{code}` — Chi tiết vé (có QR data)
- `POST /api/tickets/{code}/check-in` — Check-in (Organizer only)

##### Frontend
##### [MODIFY] [MyTicketsPage.jsx](file:///d:/Documents/J2EE/frontend/src/pages/tickets/MyTicketsPage.jsx)
- Hiển thị danh sách e-tickets với QR code (dùng thư viện `qrcode.react`)
- Ticket card design giống vé thật (rounded corners, dashed line separator)
- Status badge: ACTIVE (xanh), USED (xám), CANCELLED (đỏ)
- Download ticket as PDF (optional)

##### [NEW] `frontend/src/pages/tickets/TicketDetailPage.jsx`
- Full-screen ticket view với QR code lớn
- Thông tin sự kiện, zone, ngày giờ
- Nút "Download PDF" / "Add to Calendar"

---

#### 1.4 Email Notification System

**Vấn đề:** Không có bất kỳ thông báo nào khi user đăng ký/mua vé/sự kiện bị hủy.

**Cần làm:**

##### Backend
##### [NEW] `service/EmailService.java` + `service/impl/EmailServiceImpl.java`
- Sử dụng Spring Boot Starter Mail
- Template email dùng Thymeleaf templates
- Gửi email khi:
  - ✅ Đăng ký/mua vé thành công (kèm chi tiết + QR code)
  - ✅ Hủy vé thành công (xác nhận)
  - ✅ Sự kiện bị hủy bởi organizer (thông báo cho attendees)
  - ✅ Nhắc nhở 24h trước sự kiện (scheduled job)
  - ✅ Welcome email khi đăng ký tài khoản

##### [NEW] `config/MailConfig.java`
- Cấu hình SMTP (Gmail hoặc Mailtrap cho dev)

##### Dependency mới trong `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

---

### Phase 2: Backend Architecture Improvements 🟡

---

#### 2.1 GlobalExceptionHandler — Chuyển sang REST-aware

**Vấn đề hiện tại:** [GlobalExceptionHandler.java](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/exception/GlobalExceptionHandler.java) đang return Thymeleaf view names (`"error/error"`) nhưng project đã chuyển sang REST API + React frontend. Sẽ bị lỗi khi không tìm thấy template.

##### [MODIFY] [GlobalExceptionHandler.java](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/exception/GlobalExceptionHandler.java)
- Đổi sang `@RestControllerAdvice`
- Return `ResponseEntity` với JSON error format thống nhất:
```json
{
  "error": "message",
  "status": 404,
  "timestamp": "2026-04-01T10:00:00",
  "path": "/api/events/abc123"
}
```

---

#### 2.2 Thiếu RegistrationDto & BookingDto

**Vấn đề:** Có `RegistrationRepository` nhưng không có `RegistrationDto`. Model `Registration` và `Booking` đang trả raw entity ra API (bao gồm cả password hash nếu lồng User).

> [!WARNING]
> Trả raw entity `User` trong response API (`AdminApiController.java` line 66-67) sẽ lộ password hash. Cần DTO filter.

##### [NEW] `dto/RegistrationDto.java`
##### [NEW] `dto/BookingDto.java`
##### [NEW] `dto/UserResponseDto.java` — DTO mà KHÔNG chứa password field
##### [MODIFY] Controllers — Dùng DTO thay vì raw entity trong response

---

#### 2.3 Booking Status Enum

**Vấn đề:** Status của `Booking` và `Registration` đang dùng raw `String` → dễ sai lỗi, không type-safe.

##### [NEW] `model/enums/BookingStatus.java`
```java
public enum BookingStatus { PENDING, CONFIRMED, CANCELLED, REFUNDED }
```

##### [NEW] `model/enums/RegistrationStatus.java`
```java
public enum RegistrationStatus { CONFIRMED, CANCELLED }
```

##### [MODIFY] `Booking.java`, `Registration.java` — Đổi `String status` → Enum

---

#### 2.4 Validation & Business Logic Gaps

| Vấn đề | File | Cần fix |
|---|---|---|
| Organizer API không verify sự kiện thuộc organizer khi xem registrations | [OrganizerApiController.java:114](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/controller/api/OrganizerApiController.java#L114-L131) | Thêm ownership check |
| `getTotalRevenue()` load ALL bookings vào memory | [BookingServiceImpl.java:151](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/service/impl/BookingServiceImpl.java#L150-L156) | Dùng MongoDB Aggregation Pipeline |
| `getRevenueByEvent()` load ALL bookings vào memory | [BookingServiceImpl.java:159](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/service/impl/BookingServiceImpl.java#L158-L180) | Dùng MongoDB Aggregation Pipeline |
| Balance user không check race condition (concurrent booking) | [BookingServiceImpl.java:68](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/service/impl/BookingServiceImpl.java#L57-L72) | Dùng optimistic locking hoặc findAndModify |
| AuthApiController trả `user` map thủ công, không dùng DTO | [AuthApiController.java:48](file:///d:/Documents/J2EE/event-management/src/main/java/com/example/eventmanagement/controller/api/AuthApiController.java#L48-L56) | Dùng `UserResponseDto` |

---

#### 2.5 Unit Tests

**Vấn đề:** Không thấy bất kỳ test nào trong project.

##### [NEW] `src/test/java/.../service/impl/BookingServiceImplTest.java`
##### [NEW] `src/test/java/.../service/impl/EventServiceImplTest.java`
##### [NEW] `src/test/java/.../controller/api/AuthApiControllerTest.java`
- Sử dụng JUnit 5 + Mockito + MockMvc
- Test các business rules quan trọng: capacity check, balance check, ownership, duplicate registration...

---

### Phase 3: Frontend UX Enhancements 🟡

---

#### 3.1 Loading & Error States

**Vấn đề:** Loading state chỉ hiển thị emoji `⏳ Đang tải...`. Error handling redirect silently về `/`.

##### [NEW] `frontend/src/components/common/Skeleton.jsx`
- Shimmer/skeleton loading component cho event cards, event detail, tables

##### [NEW] `frontend/src/pages/errors/NotFoundPage.jsx`
- 404 page design đẹp với illustration và nút "Quay về trang chủ"

##### [NEW] `frontend/src/pages/errors/ErrorPage.jsx`
- Generic error page cho 500, network error...

##### [MODIFY] [App.jsx](file:///d:/Documents/J2EE/frontend/src/App.jsx)
- Thêm route `path="*"` → NotFoundPage (thay vì redirect /)
- Thêm ErrorBoundary component wrap toàn bộ Routes

---

#### 3.2 Event Card & Detail Redesign

**Vấn đề:** Event card hiện tại thiếu thông tin giá vé, thiếu hover animation. Rất basic so với Ticketbox.

##### [MODIFY] Event Card (trong `EventListPage.jsx`)
- Thêm hiển thị **giá vé** (Miễn phí / Từ xxx.xxx đ)
- **Hover animation**: lift effect, shadow tăng
- **Countdown timer** cho sự kiện sắp diễn ra (< 7 ngày)
- Badge "HOT 🔥" cho sự kiện trending (currentAttendees > 80% capacity)
- **Image lazy loading** với intersection observer

---

#### 3.3 Responsive Design

**Vấn đề:** Navbar hiện tại không có hamburger menu cho mobile. Filter bar khó dùng trên mobile.

##### [MODIFY] [Navbar.jsx](file:///d:/Documents/J2EE/frontend/src/components/common/Navbar.jsx)
- Thêm hamburger menu button
- Mobile drawer navigation
- Responsive breakpoints cho tất cả pages

##### [MODIFY] `Events.css`, `Admin.css`, `Auth.css`
- Media queries cho mobile (< 768px), tablet (768-1024px)
- Filter bar chuyển thành bottom sheet hoặc modal trên mobile

---

#### 3.4 Notification Store (In-App)

**Vấn đề:** `notificationStore.js` có sẵn nhưng chưa có UI component hiển thị.

##### [NEW] `frontend/src/components/common/NotificationBell.jsx`
- Bell icon trên Navbar với red badge count
- Dropdown danh sách notifications
- Mark as read functionality

##### [NEW] `frontend/src/components/common/Toast.jsx`
- Toast notification component cho success/error messages
- Auto dismiss sau 3-5 giây
- Tích hợp vào booking/registration actions

---

---

## Tóm Tắt Theo Mức Độ Ưu Tiên

### 🔴 Ưu tiên CAO (Nên làm ngay)

| # | Tính năng | Effort | Impact |
|---|---|---|---|
| 1 | **Hero Banner + Categories + Footer** (homepage redesign) | Medium | Rất cao — first impression |
| 2 | **Sticky CTA + Tab navigation** trên event detail | Low | Cao — conversion rate |
| 3 | **Fix GlobalExceptionHandler** (Thymeleaf → REST) | Low | Cao — bugs nếu không fix |
| 4 | **UserResponseDto** (tránh lộ password hash) | Low | Cao — security |
| 5 | **QR E-Ticket** system | Medium | Cao — core feature |
| 6 | **Responsive Mobile** (navbar + pages) | Medium | Cao — mobile users |
| 7 | **Toast Notifications** component | Low | Cao — UX feedback |

### 🟡 Ưu tiên TRUNG BÌNH (Nên làm sớm)

| # | Tính năng | Effort |
|---|---|---|
| 8 | Email notification system | Medium |
| 9 | Skeleton loading states | Low |
| 10 | 404/Error pages | Low |
| 11 | Booking/Registration DTO & status enum | Medium |
| 12 | MongoDB Aggregation cho revenue reports | Medium |
| 13 | Trending events section | Low |
| 14 | Quick time filters | Low |
| 15 | Related events on detail page | Low |
| 16 | Google Maps embed | Low |
| 17 | Unit tests cho services | Medium |
| 18 | NotificationBell component | Medium |
| 19 | Organizer ownership check | Low |

~~Phase 4 đã bị loại bỏ theo yêu cầu.~~

---

## User Review Required

> [!IMPORTANT]
> Bạn muốn tập trung vào nhóm tính năng nào trước?
> 1. **Phase 1** — UI/UX Polish (Hero, Footer, Sticky CTA, Responsive) → Làm app đẹp hơn ngay
> 2. **Phase 1** — E-Ticket + QR Code → Hoàn thiện flow mua vé
> 3. **Phase 2** — Backend fixes (ExceptionHandler, DTO, Security) → Sửa bugs/security
> 4. **All Phase 1 🔴 items** — Toàn bộ ưu tiên cao
> 5. **Phase 1 + 2 + 3** — Tất cả
> 6. Tùy chọn khác?

> [!WARNING]
> **Lỗi cần fix ngay (không liên quan phase):**
> - `GlobalExceptionHandler` đang return Thymeleaf views nhưng project chỉ có REST API → sẽ lỗi 500 khi exception xảy ra
> - `AdminApiController` trả raw `User` entity → **lộ password hash**
> - `OrganizerApiController.eventRegistrations()` không verify ownership → Organizer A có thể xem registrations của Organizer B

## Open Questions

1. **Email Service:** Bạn có SMTP credentials sẵn (Gmail app password, Mailtrap...) hay cần hướng dẫn setup?
2. **Phạm vi:** Đây là project học tập (J2EE course) hay dự định release?
3. **Thứ tự triển khai:** Bạn muốn ưu tiên frontend (UI đẹp hơn) hay backend (chắc chắn hơn) trước?

## Verification Plan

### Automated Tests
- Chạy `mvn test` sau khi thêm unit tests
- Test API endpoints bằng Postman/REST client
- Browser testing qua browser tool cho UI changes

### Manual Verification
- So sánh UI before/after với screenshots
- Test responsive trên nhiều viewport sizes
- Test toàn bộ flow: Đăng ký → Mua vé → Nhận e-ticket → Check-in
