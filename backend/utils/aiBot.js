import Event from '../models/Event.js';

/**
 * Rule-based AI Bot for EventHub support chat
 * Responds to common Vietnamese/English queries about the platform
 */

const RULES = [
  {
    keywords: ['đặt vé', 'mua vé', 'book ticket', 'buy ticket', 'booking'],
    reply: '🎟️ Để đặt vé, bạn vào trang sự kiện → chọn khu vực chỗ ngồi → thanh toán bằng số dư ví. Bạn cần đăng nhập trước nhé!\n\nTo book a ticket: go to the event page → select a seat zone → pay with wallet balance.'
  },
  {
    keywords: ['hủy vé', 'cancel ticket', 'hoàn tiền', 'refund'],
    reply: '❌ Để hủy vé, vào "Vé của tôi" → tìm vé muốn hủy → bấm "Hủy vé". Tiền sẽ được hoàn vào số dư ví của bạn ngay lập tức.\n\nTo cancel: go to My Tickets → find the ticket → click Cancel. Refund goes back to your wallet.'
  },
  {
    keywords: ['nạp tiền', 'nap tien', 'top up', 'deposit', 'số dư', 'balance', 'ví'],
    reply: '💳 Bạn có thể nạp tiền vào ví trong trang Hồ sơ → Nạp tiền. Hỗ trợ nạp tùy chỉnh số lượng.\n\nYou can top up your wallet in Profile → Add Balance.'
  },
  {
    keywords: ['đăng ký', 'register', 'tài khoản', 'account', 'tạo'],
    reply: '📝 Để đăng ký tài khoản, bấm "Đăng ký" ở góc trên cùng bên phải. Nhập tên, email và mật khẩu là xong!\n\nTo register: click "Register" at the top right. Enter your name, email and password.'
  },
  {
    keywords: ['tải vé', 'download ticket', 'pdf', 'in vé', 'print'],
    reply: '📥 Bạn có thể tải vé PDF hoặc PNG từ trang "Vé của tôi" hoặc trang QR Code của vé.\n\nYou can download your ticket as PDF or PNG from "My Tickets" or the ticket QR page.'
  },
  {
    keywords: ['email', 'gửi vé', 'send ticket'],
    reply: '📧 Bạn có thể gửi vé vào email đăng ký bằng cách vào "Vé của tôi" → chọn vé → bấm "Gửi vào Email".\n\nYou can send your ticket to your registered email via My Tickets → Send to Email.'
  },
  {
    keywords: ['check-in', 'checkin', 'quét vé', 'scan'],
    reply: '🔐 Check-in được thực hiện bởi ban tổ chức. Họ sẽ quét mã QR trên vé của bạn tại cổng vào.\n\nCheck-in is done by the organizer who scans your QR code at the entrance.'
  },
  {
    keywords: ['sự kiện', 'event', 'lịch', 'schedule', 'khi nào', 'when'],
    reply: '📅 Bạn có thể xem tất cả sự kiện sắp diễn ra tại trang chủ. Dùng bộ lọc để tìm theo thể loại, địa điểm hoặc ngày.\n\nCheck the homepage for all upcoming events. Use filters to search by category, location, or date.'
  },
  {
    keywords: ['liên hệ', 'contact', 'hỗ trợ', 'support', 'help', 'giúp'],
    reply: '📞 Đội hỗ trợ EventHub sẵn sàng giúp đỡ bạn! Hãy mô tả vấn đề của bạn và chúng tôi sẽ phản hồi sớm nhất.\n\nEventHub support team is here to help! Describe your issue and we\'ll get back to you asap.'
  },
  {
    keywords: ['organizer', 'tổ chức', 'tạo sự kiện', 'create event', 'ban tổ chức'],
    reply: '🎪 Để tổ chức sự kiện, bạn cần tài khoản Organizer. Liên hệ Admin để được nâng cấp quyền.\n\nTo organize events, you need an Organizer account. Contact Admin to upgrade your role.'
  },
  {
    keywords: ['mật khẩu', 'password', 'quên', 'forgot', 'reset'],
    reply: '🔑 Nếu quên mật khẩu, vui lòng liên hệ admin để được hỗ trợ đặt lại mật khẩu.\n\nIf you forgot your password, please contact admin to reset it.'
  },
  {
    keywords: ['xin chào', 'hello', 'hi', 'hey', 'chào'],
    reply: '👋 Xin chào! Tôi là EventHub Bot. Tôi có thể giúp bạn về:\n• Đặt vé / Book tickets\n• Hủy vé & hoàn tiền\n• Tải & gửi vé qua email\n• Thông tin sự kiện\n\nHãy hỏi tôi bất cứ điều gì! 😊'
  }
];

const DEFAULT_REPLY = '🤔 Vui lòng đợi chuyển câu hỏi cho nhân viên. Nhân viên của chúng tôi sẽ phản hồi bạn trong thời gian sớm nhất.\n\nPlease wait while we transfer your question to our support staff.';

export async function getBotReply(message) {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  try {
    // 1. Phân tích nội dung tìm kiếm liên quan đến sự kiện (thời gian, thể loại)
    const isQueryingEvents = lower.match(/(su kien|event|co gi|chuong trinh|am nhac|hoi thao|the thao|workshop|lich|schedule|khi nao)/);
    
    if (isQueryingEvents) {
      let q = { status: 'PUBLISHED' };
      let hasDateQuery = false;
      const now = new Date();

      if (lower.includes('hom nay') || lower.includes('today')) {
        const todayStr = new Date(now).toISOString().slice(0, 10);
        q.startDate = { $gte: new Date(`${todayStr}T00:00:00.000Z`), $lte: new Date(`${todayStr}T23:59:59.999Z`) };
        hasDateQuery = true;
      } else if (lower.includes('ngay mai') || lower.includes('tomorrow')) {
        const tmr = new Date(now);
        tmr.setDate(tmr.getDate() + 1);
        const tmrStr = tmr.toISOString().slice(0, 10);
        q.startDate = { $gte: new Date(`${tmrStr}T00:00:00.000Z`), $lte: new Date(`${tmrStr}T23:59:59.999Z`) };
        hasDateQuery = true;
      } else if (lower.includes('cuoi tuan') || lower.includes('weekend')) {
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + (6 - now.getDay())); 
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1); 
        const satStr = saturday.toISOString().slice(0, 10);
        const sunStr = sunday.toISOString().slice(0, 10);
        q.startDate = { $gte: new Date(`${satStr}T00:00:00.000Z`), $lte: new Date(`${sunStr}T23:59:59.999Z`) };
        hasDateQuery = true;
      } else if (lower.includes('sap toi') || lower.includes('upcoming') || lower.includes('moi nhat')) {
        q.startDate = { $gte: now };
        hasDateQuery = true;
      }

      // Từ khoá thể loại
      if (lower.includes('am nhac') || lower.includes('music')) {
         q.tags = { $in: ['Âm nhạc', 'Music', 'K-Pop', 'Live Concert', 'EDM'] };
      } else if (lower.includes('hoi thao') || lower.includes('seminar') || lower.includes('workshop')) {
         q.tags = { $in: ['Hội thảo', 'Workshop', 'Seminar', 'Tech', 'Giáo dục'] };
      } else if (lower.includes('the thao') || lower.includes('sport')) {
         q.tags = { $in: ['Thể thao', 'Sports'] };
      } else if (!hasDateQuery && message.trim().length > 3) {
         // Nếu hỏi chung chung sự kiện mà ko có ngày, tìm fulltext
         q.$text = { $search: message };
      }

      let events = [];
      if (q.$text) {
          events = await Event.find(q, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).limit(5).lean();
      } else {
          events = await Event.find(q).sort({ startDate: 1 }).limit(5).lean();
      }

      if (events && events.length > 0) {
        let reply = '📅 Tôi tìm thấy các sự kiện phù hợp với yêu cầu của bạn:\n\n';
        events.forEach(e => {
          const dateStr = e.startDate ? new Date(e.startDate).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric'}) : 'Đang cập nhật';
          reply += `👉 **${e.title}**\n   ⏰ Bắt đầu: ${dateStr}\n   📍 Tại: ${e.location}\n\n`;
        });
        reply += 'Trở ra màn hình chính, hoặc dùng thanh tìm kiếm để mua vé sự kiện mà bạn thích nhé!';
        return reply;
      } else if (hasDateQuery || q.tags) {
         return '😅 Rất tiếc, tôi không tìm thấy sự kiện nào khớp với khoảng thời gian hoặc thể loại bạn đang tìm. Bạn có thể thay đổi thời gian hoặc lên trang chủ để xem thêm nhé!';
      }
    }
  } catch (err) {
    console.error('AI DB search error:', err);
  }

  // 2. Chạy qua RULES (Nếu isQueryingEvents = true nhưng text search ko ra kết quả, nó sẽ lọt xuống đây)
  for (const rule of RULES) {
    const matched = rule.keywords.some(kw => {
      const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return lower.includes(kwNorm);
    });
    if (matched) return rule.reply;
  }

  // 3. Very generic text search if length > 5 as final fallback
  try {
    if (message.trim().length > 5) {
      const dbEvents = await Event.find(
        { $text: { $search: message }, status: 'PUBLISHED' },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(3).lean();

      if (dbEvents.length > 0) {
        let reply = 'Tôi tìm thấy thông tin trên hệ thống có liên quan đến câu hỏi của bạn:\n\n';
        dbEvents.forEach(e => {
          const dateStr = e.startDate ? new Date(e.startDate).toLocaleDateString('vi-VN') : 'Đang cập nhật';
          reply += `👉 **${e.title}** (Ngày: ${dateStr})\n`;
        });
        return reply;
      }
    }
  } catch(e) {}

  return DEFAULT_REPLY;
}
