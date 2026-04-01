import { useState, useEffect, useRef } from 'react';
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
function ShareButtons({ event, eventId }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/events/${eventId}`;
  const text = `Xem sự kiện "${event.title}" trên EventHub!`;

  const share = (platform) => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="share-buttons">
      <button onClick={() => share('facebook')} className="share-btn share-fb" title="Facebook">📘 Facebook</button>
      <button onClick={() => share('twitter')} className="share-btn share-tw" title="Twitter/X">🐦 Twitter</button>
      <button onClick={() => share('telegram')} className="share-btn share-tg" title="Telegram">✈️ Telegram</button>
      <button onClick={copyLink} className="share-btn share-copy">{copied ? '✅ Đã copy!' : '🔗 Copy link'}</button>
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

            {/* 📢 SHARE BUTTONS */}
            <div style={{ margin: '1.5rem 0', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ marginBottom: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>📢 Chia sẻ sự kiện</h4>
              <ShareButtons event={event} eventId={id} />
            </div>

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
