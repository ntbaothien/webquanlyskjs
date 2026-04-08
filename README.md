**Tên dự án:** Event Management System  
**Mục tiêu:** Xây dựng ứng dụng web quản lý sự kiện cho phép tổ chức, đăng ký và theo dõi các sự kiện.  
**Backend:** Nodejs  
**Database:** MongoDB  
**Frontend:** React
Data Model (MongoDB Documents)

### 4.1 User
```java
@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String fullName;
    private String email;           // unique, dùng để login
    private String password;        // BCrypt encoded
    private Role role;              // ADMIN | ORGANIZER | ATTENDEE
    private boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### 4.2 Event
```java
@Document(collection = "events")
public class Event {
    @Id
    private String id;
    private String title;
    private String description;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private EventStatus status;     // DRAFT | PUBLISHED | CANCELLED
    private int maxCapacity;        // giới hạn số người tham dự (0 = không giới hạn)
    private int currentAttendees;   // đếm số đã đăng ký
    private List<String> tags;      // danh mục / tag
    private String bannerImagePath; // đường dẫn ảnh banner
    private String organizerId;     // ref đến User.id
    private String organizerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### 4.3 Registration
```java
@Document(collection = "registrations")
public class Registration {
    @Id
    private String id;
    private String eventId;         // ref đến Event.id
    private String userId;          // ref đến User.id
    private String userFullName;
    private String userEmail;
    private LocalDateTime registeredAt;
    private String status;          // CONFIRMED | CANCELLED
}
```

### 4.4 Enums
```java
public enum Role {
    ADMIN, ORGANIZER, ATTENDEE
}

public enum EventStatus {
    DRAFT, PUBLISHED, CANCELLED
}
```

---## 5. Phân Quyền & Bảo Mật

### Roles
| Role | Mô tả |
|---|---|
| **GUEST** | Chưa đăng nhập. Chỉ xem danh sách & chi tiết sự kiện PUBLISHED |
| **ATTENDEE** | Đăng nhập. Xem + đăng ký tham dự sự kiện PUBLISHED |
| **ORGANIZER** | Tạo, sửa, xóa sự kiện của mình. Xem danh sách người đăng ký sự kiện của mình |
| **ADMIN** | Toàn quyền: quản lý user, quản lý tất cả sự kiện, xem báo cáo |
### Phân quyền URL (SecurityConfig)
```
GET  /                      → PUBLIC (tất cả)
GET  /events                → PUBLIC
GET  /events/{id}           → PUBLIC
GET  /auth/login            → PUBLIC
POST /auth/login            → PUBLIC
GET  /auth/register         → PUBLIC
POST /auth/register         → PUBLIC

POST /events/{id}/register  → ATTENDEE
GET  /my-registrations      → ATTENDEE

GET  /organizer/**          → ORGANIZER
POST /events/create         → ORGANIZER
PUT  /events/{id}/edit      → ORGANIZER (chỉ sự kiện của mình)
DELETE /events/{id}         → ORGANIZER (chỉ sự kiện của mình)

GET  /admin/**              → ADMIN
```## 6. Tính Năng Chi Tiết

### 6.1 Quản Lý Sự Kiện (CRUD)

**Danh sách sự kiện (Public)**
- Hiển thị tất cả sự kiện có status = PUBLISHED
- Lọc theo tag/danh mục
- Lọc theo ngày (sắp diễn ra / đã qua)
- Tìm kiếm theo tên sự kiện
- Phân trang (mỗi trang 9 sự kiện, dạng card)
- Hiển thị: banner, tên, ngày, địa điểm, số chỗ còn lại

**Chi tiết sự kiện (Public)**
- Toàn bộ thông tin sự kiện
- Số chỗ còn lại = maxCapacity - currentAttendees
- Nút "Đăng ký tham dự" (chỉ hiện nếu ATTENDEE đã login và còn chỗ)
- Nếu GUEST → redirect đến login khi bấm đăng ký

**Tạo sự kiện (ORGANIZER)**
- Form nhập: title, description, location, startDate, endDate
- Upload banner image (jpg/png, tối đa 5MB)
- Chọn tags (input dạng tag/chip)
- Đặt maxCapacity (số nguyên dương, 0 = unlimited)
- Chọn status: DRAFT (lưu nháp) hoặc PUBLISHED (công khai ngay)
- Validate: endDate phải sau startDate

**Sửa sự kiện (ORGANIZER - chỉ sự kiện của mình)**
- Tương tự form tạo, pre-fill dữ liệu cũ
- Không cho sửa nếu status = CANCELLED
- Nếu đã có người đăng ký, không cho giảm maxCapacity xuống dưới currentAttendees

**Xóa / Hủy sự kiện (ORGANIZER)**
- Không xóa vật lý nếu đã có người đăng ký → chuyển status = CANCELLED
- Xóa vật lý chỉ khi chưa có ai đăng ký

**Sự kiện của tôi (ORGANIZER)**
- Danh sách sự kiện do mình tạo (tất cả status)
- Có thể lọc theo status
- Xem danh sách người đã đăng ký từng sự kiện

### 6.2 Đăng Ký Tham Gia Sự Kiện

**Đăng ký (ATTENDEE)**
- POST `/events/{id}/register`
- Kiểm tra: sự kiện còn chỗ không (currentAttendees < maxCapacity hoặc maxCapacity = 0)
- Kiểm tra: user chưa đăng ký sự kiện này trước đó
- Tạo Registration document, tăng currentAttendees của Event
- Hiển thị thông báo thành công

**Hủy đăng ký (ATTENDEE)**
- POST `/registrations/{id}/cancel`
- Chuyển Registration.status = CANCELLED
- Giảm currentAttendees của Event

**Danh sách đăng ký của tôi (ATTENDEE)**
- GET `/my-registrations`
- Hiển thị sự kiện đã đăng ký, trạng thái, nút hủy

### 6.3 Quản Lý Người Dùng (ADMIN)

- Danh sách tất cả user (phân trang)
- Tìm kiếm theo email/tên
- Lọc theo role
- Kích hoạt / vô hiệu hóa tài khoản (enabled = true/false)
- Đổi role của user
- Xem thông tin chi tiết user

### 6.4 Thống Kê & Báo Cáo (ADMIN)

**Dashboard Admin**
- Tổng số sự kiện (theo từng status)
- Tổng số user (theo từng role)
- Tổng số lượt đăng ký
- Top 5 sự kiện có nhiều người đăng ký nhất
- Biểu đồ sự kiện theo tháng (dùng Chart.js inline)

**Báo cáo chi tiết**
- Xuất danh sách đăng ký của một sự kiện (hiển thị dạng bảng)
- Thống kê theo khoảng thời gian

---
## 8. Cấu Hình `application.properties`

```properties
# MongoDB
spring.data.mongodb.uri=mongodb://localhost:27017/eventdb

# Server
server.port=8080

# Session
server.servlet.session.timeout=30m

# File upload
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=10MB

# Upload directory
app.upload.dir=src/main/resources/static/uploads/
