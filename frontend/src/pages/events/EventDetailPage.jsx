import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getImageUrl } from '../../utils/getImageUrl';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import './Events.css';

// ---- Countdown Hook ----
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft(targetDate));
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft(targetDate)), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return timeLeft;
}
function calcTimeLeft(target) {
  const diff = new Date(target) - new Date();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

// ---- Google Calendar URL ----
function getGoogleCalendarUrl(event) {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = fmt(event.startDate);
  const end = event.endDate ? fmt(event.endDate) : fmt(new Date(new Date(event.startDate).getTime() + 2 * 3600000));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description?.substring(0, 200) || '',
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// ---- Share Component ----
const SHARE_PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877f2',
    hoverBg: 'rgba(24,119,242,0.18)',
    hoverBorder: 'rgba(24,119,242,0.45)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.254h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'twitter',
    label: 'Twitter/X',
    color: '#1d9bf0',
    hoverBg: 'rgba(29,155,240,0.18)',
    hoverBorder: 'rgba(29,155,240,0.45)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    color: '#26a6d3',
    hoverBg: 'rgba(38,166,211,0.18)',
    hoverBorder: 'rgba(38,166,211,0.45)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25d366',
    hoverBg: 'rgba(37,211,102,0.18)',
    hoverBorder: 'rgba(37,211,102,0.45)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    color: '#0a66c2',
    hoverBg: 'rgba(10,102,194,0.18)',
    hoverBorder: 'rgba(10,102,194,0.45)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    getUrl: (url, text) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
  },
];

function ShareButtons({ event, eventId }) {
  const [copied, setCopied] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [nativeShareSupported] = useState(() => !!navigator.share);

  // Regular SPA URL (for Twitter, Telegram, WhatsApp, LinkedIn, copy)
  const url = `${window.location.origin}/events/${eventId}`;

  // OG proxy URL served by the backend — Facebook crawler reads OG meta tags from here
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const ogUrl = `${apiBase}/share/events/${eventId}`;

  const text = `Xem sự kiện "${event.title}" trên EventHub!`;

  const handleShare = (platform) => {
    const p = SHARE_PLATFORMS.find(x => x.key === platform);
    if (!p) return;
    // Facebook uses the OG proxy URL so the crawler can read meta tags
    const shareUrl = platform === 'facebook' ? ogUrl : url;
    window.open(p.getUrl(shareUrl, text), '_blank', 'width=640,height=480,noopener,noreferrer');
    setShareCount(c => c + 1);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: event.title, text, url });
      setShareCount(c => c + 1);
    } catch {}
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setShareCount(c => c + 1);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="share-section">
      <div className="share-stats">
        {shareCount > 0 && (
          <span className="share-count">🚀 Đã chia sẻ {shareCount} lần trong phiên này</span>
        )}
      </div>
      <div className="share-buttons">
        {SHARE_PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => handleShare(p.key)}
            className={`share-btn share-${p.key}`}
            title={`Chia sẻ qua ${p.label}`}
            style={{ '--share-color': p.color, '--share-bg': p.hoverBg, '--share-border': p.hoverBorder }}
          >
            <span className="share-icon">{p.icon}</span>
            <span className="share-label">{p.label}</span>
          </button>
        ))}

        {nativeShareSupported && (
          <button onClick={handleNativeShare} className="share-btn share-native" title="Chia sẻ">
            <span className="share-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </span>
            <span className="share-label">Chia sẻ</span>
          </button>
        )}

        <button onClick={copyLink} className={`share-btn share-copy ${copied ? 'copied' : ''}`} title="Copy link">
          <span className="share-icon">
            {copied
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            }
          </span>
          <span className="share-label">{copied ? 'Đã copy!' : 'Copy link'}</span>
        </button>
      </div>
    </div>
  );
}

// ── Report reasons ──────────────────────────────────────────────────────────
const REPORT_REASONS = [
  { value: 'SPAM',          label: '🚫 Spam / Quảng cáo rác' },
  { value: 'MISLEADING',    label: '⚠️ Thông tin sai lệch / gây hiểu nhầm' },
  { value: 'INAPPROPRIATE', label: '🔞 Nội dung không phù hợp' },
  { value: 'FRAUD',         label: '💸 Lừa đảo / Gian lận' },
  { value: 'DUPLICATE',     label: '📋 Sự kiện trùng lặp' },
  { value: 'OTHER',         label: '❓ Lý do khác' },
];

// ── Report Modal ──────────────────────────────────────────────────────────────
function ReportModal({ eventId, eventTitle, onClose }) {
  const [reason, setReason]         = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { setError('Vui lòng chọn lý do báo cáo'); return; }
    setSubmitting(true);
    setError('');
    try {
      await axiosInstance.post(`/events/${eventId}/report`, { reason, description });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Gửi báo cáo thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-modal-header">
          <div>
            <h3>🚨 Báo cáo vi phạm</h3>
            <p className="report-modal-sub">{eventTitle}</p>
          </div>
          <button className="report-close-btn" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div className="report-done">
            <div className="report-done-icon">✅</div>
            <h4>Báo cáo đã được gửi!</h4>
            <p>Cảm ơn bạn đã phản ánh. Đội ngũ kiểm duyệt sẽ xem xét và xử lý sớm nhất.</p>
            <button className="report-submit-btn" onClick={onClose}>Đóng</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="report-field">
              <label className="report-label">Lý do báo cáo <span style={{ color: '#f87171' }}>*</span></label>
              <div className="report-reasons">
                {REPORT_REASONS.map(r => (
                  <label key={r.value} className={`report-reason-item ${reason === r.value ? 'selected' : ''}`}>
                    <input type="radio" name="reason" value={r.value}
                      checked={reason === r.value}
                      onChange={() => { setReason(r.value); setError(''); }} />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="report-field">
              <label className="report-label">Mô tả thêm (tùy chọn)</label>
              <textarea
                className="report-textarea"
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải với sự kiện này..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
              />
              <span className="report-char-count">{description.length}/1000</span>
            </div>

            {error && <div className="report-error">⚠️ {error}</div>}

            <div className="report-actions">
              <button type="button" className="report-cancel-btn" onClick={onClose}>Hủy</button>
              <button type="submit" className="report-submit-btn" disabled={submitting || !reason}>
                {submitting ? '⏳ Đang gửi...' : '🚨 Gửi báo cáo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState({ text: '', type: '' });

  // Similar events
  const [similar, setSimilar] = useState([]);

  // Save event
  const [saved, setSaved] = useState(false);

  // Report
  const [showReport, setShowReport] = useState(false);
  const [myReport, setMyReport] = useState(null);

  // Countdown - must be called before any returns (React hooks rule)
  const countdown = useCountdown(data?.event?.startDate);

  useEffect(() => {
    axiosInstance.get(`/events/${id}`)
      .then(r => setData(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));

    axiosInstance.get(`/events/${id}/reviews`)
      .then(r => setReviews(r.data.data || []))
      .catch(() => {});

    axiosInstance.get(`/events/${id}/similar`)
      .then(r => setSimilar(r.data || []))
      .catch(() => {});

    // Check if user already reported
    axiosInstance.get(`/events/${id}/my-report`)
      .then(r => setMyReport(r.data.report))
      .catch(() => {});
  }, [id]);

  const handleRegister = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data: res } = await axiosInstance.post(`/events/${id}/register`);
      setMessage(res.message);
      setMsgType('success');
      setData(prev => ({
        ...prev,
        alreadyRegistered: true,
        event: { ...prev.event, currentAttendees: prev.event.currentAttendees + 1 }
      }));
    } catch (err) {
      setMessage(err.response?.data?.error || 'Đăng ký thất bại');
      setMsgType('error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setReviewMsg({ text: 'Đang gửi đánh giá...', type: 'info' });
    try {
      const { data: res } = await axiosInstance.post(`/events/${id}/reviews`, { rating, comment });
      setReviewMsg({ text: res.message, type: 'success' });
      setReviews([res.data, ...reviews]);
      setComment('');
      setRating(5);
    } catch (err) {
      setReviewMsg({ text: err.response?.data?.error || 'Đánh giá thất bại', type: 'error' });
    }
  };

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data: res } = await axiosInstance.post(`/users/me/saved/${id}`);
      setSaved(res.saved);
    } catch {}
  };

  if (loading) return <><Navbar /><div className="loading-state">⏳ Đang tải...</div></>;
  if (!data) return null;
  const { event, spotsLeft, alreadyRegistered } = data;
  const isPaid = !event.free;

  const totalAvailablePaid = isPaid
    ? (event.seatZones || []).reduce((sum, z) => sum + Math.max(0, z.totalSeats - z.soldSeats), 0)
    : 0;

  const bannerUrl = getImageUrl(event.bannerImagePath);
  const eventPast = new Date(event.endDate || event.startDate) < new Date();
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="event-detail">
          {bannerUrl && (
            <img className="event-detail-banner"
              src={bannerUrl}
              alt={event.title}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://via.placeholder.com/1200x380?text=No+Image'; }}
            />
          )}
          <div className="event-detail-content">
            <div className="event-detail-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`event-status-tag status-${event.status?.toLowerCase()}`}>{event.status}</span>
                  {isPaid
                    ? <span className="event-status-tag" style={{ background: 'rgba(255,193,7,0.15)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.3)' }}>💳 Có phí</span>
                    : <span className="event-status-tag" style={{ background: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>🆓 Miễn phí</span>
                  }
                  {avgRating && (
                    <span className="event-status-tag" style={{ background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' }}>
                      ⭐ {avgRating}/5 ({reviews.length})
                    </span>
                  )}
                </div>
                <h1>{event.title}</h1>
                <p className="event-meta">📍 {event.location}</p>
                <p className="event-meta">
                  📅 {new Date(event.startDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {event.endDate && ` → ${new Date(event.endDate).toLocaleDateString('vi-VN')}`}
                </p>
                <p className="event-meta">⏰ {new Date(event.startDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="event-meta">👤 Tổ chức: <strong>{event.organizerName}</strong></p>

                {/* ⏳ COUNTDOWN */}
                {countdown && !eventPast && (
                  <div className="countdown-container">
                    <div className="countdown-label">⏳ Sự kiện bắt đầu sau</div>
                    <div className="countdown-grid">
                      <div className="countdown-item">
                        <span className="countdown-num">{countdown.days}</span>
                        <span className="countdown-unit">Ngày</span>
                      </div>
                      <div className="countdown-item">
                        <span className="countdown-num">{String(countdown.hours).padStart(2, '0')}</span>
                        <span className="countdown-unit">Giờ</span>
                      </div>
                      <div className="countdown-item">
                        <span className="countdown-num">{String(countdown.minutes).padStart(2, '0')}</span>
                        <span className="countdown-unit">Phút</span>
                      </div>
                      <div className="countdown-item">
                        <span className="countdown-num">{String(countdown.seconds).padStart(2, '0')}</span>
                        <span className="countdown-unit">Giây</span>
                      </div>
                    </div>
                  </div>
                )}

                {eventPast && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem', color: '#fca5a5' }}>
                    🏁 Sự kiện đã kết thúc
                  </div>
                )}
              </div>

              <div className="event-detail-sidebar">
                {/* Spots box */}
                {!isPaid ? (
                  <div className="spots-box">
                    <div className="spots-number">{spotsLeft === 2147483647 ? '∞' : spotsLeft}</div>
                    <div className="spots-label">Chỗ còn trống</div>
                  </div>
                ) : (
                  <div className="spots-box">
                    <div className="spots-number">{totalAvailablePaid}</div>
                    <div className="spots-label">Tổng ghế còn</div>
                  </div>
                )}

                {message && <div className={`msg-box ${msgType}`}>{message}</div>}

                {event.status === 'PUBLISHED' && user?.role === 'ATTENDEE' && !eventPast && (
                  <>
                    {!isPaid && !alreadyRegistered && (
                      <button className="btn-register" onClick={handleRegister} disabled={spotsLeft === 0}>
                        {spotsLeft === 0 ? '❌ Hết chỗ' : '🎟 Đặt chỗ miễn phí'}
                      </button>
                    )}
                    {!isPaid && alreadyRegistered && (
                      <div className="msg-box success">✅ Bạn đã đặt chỗ sự kiện này</div>
                    )}
                    {isPaid && totalAvailablePaid > 0 && (
                      <button className="btn-register btn-paid" onClick={() => navigate(`/events/${id}/book`)}>
                        🪑 Chọn chỗ ngồi & Đặt vé
                      </button>
                    )}
                    {isPaid && totalAvailablePaid === 0 && (
                      <button className="btn-register" disabled>❌ Hết vé</button>
                    )}
                  </>
                )}

                {event.status === 'PUBLISHED' && eventPast && (
                  <button className="btn-register" disabled style={{ opacity: 0.5 }}>
                    🏁 Sự kiện đã kết thúc
                  </button>
                )}

                {!user && event.status === 'PUBLISHED' && !eventPast && (
                  <button className="btn-register" onClick={() => navigate('/login')}>
                    🔐 Đăng nhập để {isPaid ? 'mua vé' : 'đăng ký'}
                  </button>
                )}

                {/* 📅 Google Calendar + ❤️ Save */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <a href={getGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                    📅 Google Calendar
                  </a>
                  <button onClick={handleSave} className="btn-secondary" style={{ flex: 1 }}>
                    {saved ? '❤️ Đã lưu' : '🤍 Lưu sự kiện'}
                  </button>
                </div>
              </div>
            </div>

            {/* Zones info cho sự kiện có phí */}
            {isPaid && event.seatZones?.length > 0 && (
              <div style={{ margin: '1.5rem 0' }}>
                <h3 style={{ marginBottom: '1rem' }}>🗺️ Khu vực & Giá vé</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {event.seatZones.map(zone => {
                    const available = Math.max(0, zone.totalSeats - zone.soldSeats);
                    const pct = zone.totalSeats > 0 ? (zone.soldSeats / zone.totalSeats) * 100 : 0;
                    return (
                      <div key={zone._id || zone.id} style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '1rem',
                        borderLeft: `4px solid ${zone.color || '#6c63ff'}`
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: zone.color || '#fff' }}>{zone.name}</div>
                        {zone.description && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: '0.25rem 0' }}>{zone.description}</div>}
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', margin: '0.5rem 0' }}>
                          {zone.price === 0 ? 'Miễn phí' : `${zone.price.toLocaleString('vi-VN')}đ`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: available <= 5 ? '#fca5a5' : 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                          {available <= 5 && available > 0 ? `⚡ Chỉ còn ${available} ghế!` : `Còn ${available} / ${zone.totalSeats} ghế`}
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : zone.color || '#6c63ff', transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="event-detail-desc">
              <h3>Mô tả sự kiện</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
            </div>
            {event.tags?.length > 0 && (
              <div className="event-tags">
                {event.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}

            {/* 📢 SHARE + REPORT */}
            <div style={{ margin: '1.5rem 0', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>📢 Chia sẻ sự kiện</h4>
                {user && (
                  myReport ? (
                    <span style={{ fontSize: '0.78rem', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.2)' }}>
                      ⚠️ Đã báo cáo sự kiện này
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowReport(true)}
                      style={{ background: 'none', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', color: 'rgba(248,113,113,0.7)', fontSize: '0.78rem', padding: '0.25rem 0.65rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)'; e.currentTarget.style.background = 'none'; }}
                    >
                      🚨 Báo cáo vi phạm
                    </button>
                  )
                )}
              </div>
              <ShareButtons event={event} eventId={id} />
            </div>

            {/* Report Modal */}
            {showReport && (
              <ReportModal
                eventId={id}
                eventTitle={event.title}
                onClose={() => {
                  setShowReport(false);
                  // Re-check report status after closing
                  axiosInstance.get(`/events/${id}/my-report`)
                    .then(r => setMyReport(r.data.report)).catch(() => {});
                }}
              />
            )}

            {/* ⭐ REVIEWS */}
            <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />
            <div className="event-reviews">
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⭐ Đánh giá & Phản hồi
                <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'rgba(255,255,255,0.6)' }}>
                  ({reviews.length} đánh giá{avgRating ? ` • ${avgRating}/5` : ''})
                </span>
              </h3>

              {event.endDate && new Date(event.endDate) < new Date() && user?.role === 'ATTENDEE' && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Viết đánh giá của bạn</h4>
                  {reviewMsg.text && (
                    <div className={`msg-box ${reviewMsg.type}`} style={{ marginBottom: '1rem' }}>{reviewMsg.text}</div>
                  )}
                  <form onSubmit={handleReviewSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Số sao:</label>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => setRating(s)}
                            style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                            ⭐
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <textarea
                        required value={comment} onChange={e => setComment(e.target.value)}
                        placeholder="Chia sẻ trải nghiệm của bạn về sự kiện này..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', minHeight: '100px' }}
                      />
                    </div>
                    <button type="submit" className="btn-register" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                      Gửi đánh giá
                    </button>
                  </form>
                </div>
              )}

              {reviews.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>Chưa có đánh giá nào cho sự kiện này.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reviews.map(rev => (
                    <div key={rev._id || rev.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem 1.5rem', borderRadius: '8px', borderLeft: '3px solid #6c63ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ color: '#fff' }}>{rev.userFullName}</strong>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                          {new Date(rev.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div style={{ color: '#facc15', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        {'⭐'.repeat(rev.rating)}
                      </div>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🎯 SIMILAR EVENTS */}
            {similar.length > 0 && (
              <>
                <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>🎯 Sự kiện tương tự</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {similar.map(ev => (
                      <Link key={ev._id} to={`/events/${ev._id}`}
                        style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s' }}
                        className="similar-card">
                        <h4 style={{ color: '#fff', marginBottom: '0.4rem', fontSize: '0.95rem' }}>{ev.title}</h4>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', margin: 0 }}>
                          📍 {ev.location} • 📅 {new Date(ev.startDate).toLocaleDateString('vi-VN')}
                        </p>
                        <div style={{ marginTop: '0.5rem' }}>
                          {ev.free ? (
                            <span style={{ fontSize: '0.75rem', color: '#81c784', background: 'rgba(76,175,80,0.15)', padding: '2px 8px', borderRadius: '10px' }}>Miễn phí</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#ffc107', background: 'rgba(255,193,7,0.15)', padding: '2px 8px', borderRadius: '10px' }}>Có phí</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
