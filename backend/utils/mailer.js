import nodemailer from 'nodemailer';

/**
 * Create reusable transporter
 * Uses Gmail SMTP if MAIL_USER/MAIL_PASS set, otherwise Ethereal (test)
 */
async function createTransporter() {
  if (process.env.MAIL_USER && process.env.MAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });
  }

  // Fallback: Ethereal fake SMTP for development
  const testAccount = await nodemailer.createTestAccount();
  console.log('📧 Ethereal test account:', testAccount.user);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
}

/**
 * Send ticket confirmation email
 * @param {string} to - Recipient email
 * @param {object} ticket - Ticket data
 * @param {object} user - User data
 */
export async function sendTicketEmail(to, ticket, user) {
  const transporter = await createTransporter();

  const statusLabel = {
    ACTIVE: '✅ Hợp lệ / Valid',
    USED: '☑️ Đã sử dụng / Used',
    CANCELLED: '❌ Đã hủy / Cancelled'
  }[ticket.status] || ticket.status;

  const eventDate = ticket.eventDate
    ? new Date(ticket.eventDate).toLocaleDateString('vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : 'N/A';

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vé EventHub</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#16213e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e94560,#a020f0);padding:28px 32px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:-0.5px;">🎪 EventHub</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Vé điện tử / E-Ticket</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0 0 24px;">
                Xin chào <strong style="color:#fff;">${user.fullName}</strong>,<br>
                Đây là vé điện tử của bạn cho sự kiện dưới đây.
              </p>

              <!-- Ticket Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#0f0f1a;border-radius:12px;border:1px solid rgba(255,255,255,0.15);overflow:hidden;">

                <!-- Event Title -->
                <tr>
                  <td colspan="2" style="padding:20px 20px 12px;border-bottom:1px dashed rgba(255,255,255,0.15);">
                    <h2 style="color:#fff;margin:0;font-size:18px;">${ticket.eventTitle}</h2>
                    <p style="color:#a78bfa;margin:6px 0 0;font-size:13px;font-weight:600;">
                      🪑 Khu vực: ${ticket.zoneName || 'Sảnh chung'}
                    </p>
                  </td>
                </tr>

                <!-- Details -->
                <tr>
                  <td style="padding:16px 20px;color:rgba(255,255,255,0.65);font-size:13px;vertical-align:top;width:50%;">
                    📅 <strong style="color:#fff;">Ngày sự kiện</strong><br>
                    <span style="margin-left:18px;">${eventDate}</span>
                  </td>
                  <td style="padding:16px 20px;color:rgba(255,255,255,0.65);font-size:13px;vertical-align:top;">
                    👤 <strong style="color:#fff;">Người tham dự</strong><br>
                    <span style="margin-left:18px;">${ticket.userFullName || user.fullName}</span>
                  </td>
                </tr>

                <!-- Status & Code -->
                <tr>
                  <td style="padding:0 20px 16px;color:rgba(255,255,255,0.65);font-size:13px;vertical-align:top;">
                    📊 <strong style="color:#fff;">Trạng thái</strong><br>
                    <span style="margin-left:18px;">${statusLabel}</span>
                  </td>
                  <td style="padding:0 20px 16px;vertical-align:top;">
                    <div style="background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);
                      border-radius:8px;padding:8px 12px;text-align:center;">
                      <div style="color:rgba(255,255,255,0.5);font-size:10px;margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;">Mã vé</div>
                      <div style="color:#a78bfa;font-family:monospace;font-size:13px;font-weight:700;letter-spacing:2px;">
                        ${ticket.ticketCode}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- QR note -->
              <div style="margin-top:20px;padding:14px;background:rgba(233,69,96,0.1);
                border:1px solid rgba(233,69,96,0.25);border-radius:10px;text-align:center;">
                <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;">
                  📱 Mở ứng dụng EventHub và dùng mã <strong style="color:#e94560;">${ticket.ticketCode}</strong>
                  để hiển thị QR code check-in tại cửa vào sự kiện.
                </p>
              </div>

              <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:24px 0 0;text-align:center;">
                Email này được gửi tự động từ EventHub. Vui lòng không reply email này.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(255,255,255,0.04);padding:16px 32px;text-align:center;
              border-top:1px solid rgba(255,255,255,0.08);">
              <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;">
                © 2026 EventHub · Nền tảng quản lý sự kiện
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || '"EventHub" <noreply@eventhub.vn>',
    to,
    subject: `🎟️ Vé của bạn: ${ticket.eventTitle} — EventHub`,
    html
  });

  // Log preview URL for Ethereal
  if (!process.env.MAIL_USER) {
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
}

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} resetURL - Full reset password URL
 * @param {string} fullName - User full name
 */
export async function sendResetPasswordEmail(to, resetURL, fullName) {
  const transporter = await createTransporter();

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu - EventHub</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#16213e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e94560,#a020f0);padding:28px 32px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:-0.5px;">🔐 EventHub</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Đặt lại mật khẩu</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0 0 24px;">
                Xin chào <strong style="color:#fff;">${fullName}</strong>,<br>
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
              </p>

              <!-- Warning -->
              <div style="background:rgba(233,69,96,0.1);border:1px solid rgba(233,69,96,0.25);
                border-radius:10px;padding:14px;margin-bottom:24px;">
                <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;">
                  ⚠️ <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn trong <strong>30 phút</strong>.
                  Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.
                </p>
              </div>

              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${resetURL}"
                      style="display:inline-block;background:linear-gradient(135deg,#e94560,#a020f0);
                      color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;
                      font-weight:600;font-size:15px;letter-spacing:0.3px;">
                      🔗 Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Text -->
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;">
                  <strong style="color:rgba(255,255,255,0.65);">Hoặc sao chép liên kết này:</strong>
                </p>
                <p style="color:#a78bfa;font-family:monospace;font-size:11px;margin:0;
                  word-break:break-all;line-height:1.6;">
                  ${resetURL}
                </p>
              </div>

              <!-- Steps -->
              <div style="margin-bottom:24px;">
                <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:0 0 16px;font-weight:600;">
                  📝 Các bước tiếp theo:
                </p>
                <ol style="color:rgba(255,255,255,0.65);font-size:13px;margin:0;padding-left:20px;">
                  <li style="margin-bottom:8px;">Nhấp vào nút "Đặt lại mật khẩu" ở trên</li>
                  <li style="margin-bottom:8px;">Nhập mật khẩu mới của bạn</li>
                  <li>Đăng nhập với mật khẩu mới</li>
                </ol>
              </div>

              <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:24px 0 0;text-align:center;">
                Email này được gửi tự động từ EventHub. Vui lòng không reply email này.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(255,255,255,0.04);padding:16px 32px;text-align:center;
              border-top:1px solid rgba(255,255,255,0.08);">
              <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;">
                © 2026 EventHub · Nền tảng quản lý sự kiện
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || '"EventHub" <noreply@eventhub.vn>',
    to,
    subject: '🔐 Đặt lại mật khẩu EventHub',
    html
  });

  if (!process.env.MAIL_USER) {
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
}
