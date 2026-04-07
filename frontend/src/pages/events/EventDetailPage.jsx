import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import { getImageUrl } from '../../utils/getImageUrl';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import EventForum from '../../components/events/EventForum';
import EventPolls from '../../components/events/EventPolls';
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
  const { t } = useTranslation();
  const url = `${window.location.origin}/events/${eventId}`;
  const text = `Check out "${event.title}" on EventHub!`;

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
      <button onClick={copyLink} className="share-btn share-copy">{copied ? '✅ ' + t('common.copied', 'Copied!') : '🔗 ' + t('eventDetail.copyLink', 'Copy link')}</button>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { t } = useTranslation();
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
  const { search } = useLocation();
  const [activeTab, setActiveTab] = useState('info');

  // Similar events
  const [similar, setSimilar] = useState([]);

  // Save event
  const [saved, setSaved] = useState(false);
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Countdown
  const countdown = useCountdown(data?.event?.startDate);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await axiosInstance.get(`/events/${id}`);
        setData(res);
      } catch (err) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const { data: res } = await axiosInstance.get(`/events/${id}/reviews`);
        setReviews(res.data || []);
      } catch (err) {}
    };

    const fetchSimilar = async () => {
      try {
        const { data: res } = await axiosInstance.get(`/events/${id}/similar`);
        setSimilar(res || []);
      } catch (err) {}
    };

    const fetchWaitlistStatus = async () => {
      if (!user) return;
      try {
        const { data: res } = await axiosInstance.get(`/events/${id}/waitlist-status`);
        setOnWaitlist(res.onWaitlist);
      } catch (err) {}
    };

    fetchData();
    fetchReviews();
    fetchSimilar();
    fetchWaitlistStatus();

    // Check for tab param
    const qTab = new URLSearchParams(search).get('tab');
    if (qTab) setActiveTab(qTab);

  }, [id, navigate, user, search]);

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
      setMessage(err.response?.data?.error || 'Registration failed');
      setMsgType('error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setReviewMsg({ text: 'Submitting review...', type: 'info' });
    try {
      const { data: res } = await axiosInstance.post(`/events/${id}/reviews`, { rating, comment });
      setReviewMsg({ text: res.message, type: 'success' });
      setReviews([res.data, ...reviews]);
      setComment('');
      setRating(5);
    } catch (err) {
      setReviewMsg({ text: err.response?.data?.error || 'Review submission failed', type: 'error' });
    }
  };

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data: res } = await axiosInstance.post(`/users/me/saved/${id}`);
      setSaved(res.saved);
    } catch {}
  };

  const handleAddToWaitlist = async () => {
    if (!user) { navigate('/login'); return; }
    setWaitlistLoading(true);
    try {
      const { data: res } = await axiosInstance.post(`/events/${id}/waitlist`);
      setOnWaitlist(true);
      setMessage(res.message);
      setMsgType('success');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Lỗi đăng ký nhận thông báo');
      setMsgType('error');
    } finally {
      setWaitlistLoading(false);
    }
  };

  if (loading) return <><Navbar /><div className="loading-state">⏳ {t('eventDetail.loading')}</div></>;
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
                    ? <span className="event-status-tag tag-paid">💳 {t('eventDetail.paid')}</span>
                    : <span className="event-status-tag tag-free">🆓 {t('eventDetail.free')}</span>
                  }
                  {avgRating && (
                    <span className="event-status-tag tag-rating">
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
                <p className="event-meta">👤 {t('eventDetail.organizedBy')}: <strong>{event.organizerName}</strong></p>

                {user && (user._id === event.organizerId || user.role === 'ADMIN') && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('polls')} className="btn-secondary" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      📊 Quản lý Bình chọn
                    </button>
                    <button onClick={() => navigate(`/organizer/events/${id}/registrations`)} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      👥 Quản lý Đăng ký
                    </button>
                  </div>
                )}

                {countdown && !eventPast && (
                  <div className="countdown-container">
                    <div className="countdown-label">⏳ {t('eventDetail.eventStartsIn')}</div>
                    <div className="countdown-grid">
                      <div className="countdown-item">
                        <span className="countdown-num">{countdown.days}</span>
                        <span className="countdown-unit">{t('eventDetail.days')}</span>
                      </div>
                      <div className="countdown-item">
                        <span className="countdown-num">{String(countdown.hours).padStart(2, '0')}</span>
                        <span className="countdown-unit">{t('eventDetail.hours')}</span>
                      </div>
                      <div className="countdown-item">
                        <span className="countdown-num">{String(countdown.minutes).padStart(2, '0')}</span>
                        <span className="countdown-unit">{t('eventDetail.minutes')}</span>
                      </div>
                      <div className="countdown-item">
                        <span className="countdown-num">{String(countdown.seconds).padStart(2, '0')}</span>
                        <span className="countdown-unit">{t('eventDetail.seconds')}</span>
                      </div>
                    </div>
                  </div>
                )}
                {eventPast && <div className="event-past-alert">🏁 {t('eventDetail.eventHasEnded')}</div>}
              </div>

              <div className="event-detail-sidebar">
                <div className="spots-box">
                  <div className="spots-number">{isPaid ? totalAvailablePaid : (spotsLeft === 2147483647 ? '∞' : spotsLeft)}</div>
                  <div className="spots-label">{isPaid ? t('eventDetail.totalSeats') : t('eventDetail.spotsAvailable')}</div>
                </div>

                {message && <div className={`msg-box ${msgType}`}>{message}</div>}

                {event.status === 'PUBLISHED' && user?.role === 'ATTENDEE' && !eventPast && (
                  <>
                    {!isPaid && !alreadyRegistered && (
                      <button className="btn-register" onClick={handleRegister} disabled={spotsLeft === 0}>
                        {spotsLeft === 0 ? `❌ ${t('eventDetail.soldOut')}` : `🎟 ${t('eventDetail.registerFree')}`}
                      </button>
                    )}
                    {!isPaid && alreadyRegistered && <div className="msg-box success">✅ {t('eventDetail.youRegistered')}</div>}
                    {isPaid && totalAvailablePaid > 0 && (
                      <button className="btn-register btn-paid" onClick={() => navigate(`/events/${id}/book`)}>
                        🪑 {t('eventDetail.selectSeatsBook', 'Chọn chỗ & Đặt vé')}
                      </button>
                    )}
                    {isPaid && totalAvailablePaid === 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button className="btn-register" disabled>❌ {t('eventDetail.ticketsSoldOut')}</button>
                        {!onWaitlist ? (
                          <button className="btn-secondary" onClick={handleAddToWaitlist} disabled={waitlistLoading}>
                            🔔 {waitlistLoading ? '...' : t('eventDetail.notifyMe')}
                          </button>
                        ) : (
                          <div className="msg-box info" style={{ margin: 0, fontSize: '0.85rem' }}>
                            {t('eventDetail.onWaitlist')}
                          </div>
                        )}
                      </div>
                    )}
                    {!isPaid && spotsLeft === 0 && !alreadyRegistered && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {!onWaitlist ? (
                          <button className="btn-secondary" onClick={handleAddToWaitlist} disabled={waitlistLoading}>
                            🔔 {waitlistLoading ? '...' : t('eventDetail.notifyMe')}
                          </button>
                        ) : (
                          <div className="msg-box info" style={{ margin: 0, fontSize: '0.85rem' }}>
                            {t('eventDetail.onWaitlist')}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <a href={getGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                    📅 {t('eventDetail.googleCalendar')}
                  </a>
                  <button onClick={handleSave} className="btn-secondary" style={{ flex: 1 }}>
                    {saved ? `❤️ ${t('eventDetail.savedEvent')}` : `🤍 ${t('eventDetail.saveEvent')}`}
                  </button>
                </div>
              </div>
            </div>

            {/* 📑 TABS NAVIGATION */}
            <div className="event-tabs" style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', margin: '2rem 0' }}>
              <button className={`tab-link ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}
                style={{ padding: '1rem 0', background: 'none', border: 'none', color: activeTab === 'info' ? '#e94560' : 'var(--text-secondary)', borderBottom: activeTab === 'info' ? '2px solid #e94560' : 'none', cursor: 'pointer', fontWeight: '600' }}>
                ℹ️ {t('eventDetail.tabInfo', 'Thông tin')}
              </button>
              <button className={`tab-link ${activeTab === 'forum' ? 'active' : ''}`} onClick={() => setActiveTab('forum')}
                style={{ padding: '1rem 0', background: 'none', border: 'none', color: activeTab === 'forum' ? '#e94560' : 'var(--text-secondary)', borderBottom: activeTab === 'forum' ? '2px solid #e94560' : 'none', cursor: 'pointer', fontWeight: '600' }}>
                💬 {t('eventDetail.tabForum', 'Diễn đàn')}
              </button>
              <button className={`tab-link ${activeTab === 'polls' ? 'active' : ''}`} onClick={() => setActiveTab('polls')}
                style={{ padding: '1rem 0', background: 'none', border: 'none', color: activeTab === 'polls' ? '#e94560' : 'var(--text-secondary)', borderBottom: activeTab === 'polls' ? '2px solid #e94560' : 'none', cursor: 'pointer', fontWeight: '600' }}>
                📊 {t('eventDetail.tabPolls', 'Bình chọn')}
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'info' && (
                <>
                  <div className="event-detail-desc">
                    <h3>{t('eventDetail.eventDescription')}</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
                  </div>
                  {event.tags?.length > 0 && (
                    <div className="event-tags" style={{ marginTop: '1rem' }}>
                      {event.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                  )}

                  {isPaid && event.seatZones?.length > 0 && (
                    <div style={{ margin: '2rem 0' }}>
                      <h3 style={{ marginBottom: '1rem' }}>🗺️ {t('eventDetail.zonesTickets')}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {event.seatZones.map(zone => {
                          const avail = Math.max(0, zone.totalSeats - zone.soldSeats);
                          return (
                            <div key={zone._id || zone.id} className="ticket-zone-card" style={{ borderLeftColor: zone.color || '#6c63ff' }}>
                              <div style={{ fontWeight: 700, fontSize: '1rem', color: zone.color || 'var(--text-primary)' }}>{zone.name}</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', margin: '0.4rem 0' }}>
                                {zone.price === 0 ? t('eventDetail.free') : `${zone.price.toLocaleString('vi-VN')} VNĐ`}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: avail <= 5 ? '#ef4444' : 'var(--text-secondary)' }}>{avail} / {zone.totalSeats} seats</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />
                  <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>📢 {t('eventDetail.shareEvent')}</h4>
                    <ShareButtons event={event} eventId={id} />
                  </div>

                  {/* ⭐ REVIEWS */}
                  <div className="event-reviews" style={{ marginTop: '3rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>⭐ {t('eventDetail.reviewsFeedback')}</h3>
                    {reviewMsg.text && <div className={`msg-box ${reviewMsg.type}`} style={{ marginBottom: '1rem' }}>{reviewMsg.text}</div>}
                    
                    {eventPast && user?.role === 'ATTENDEE' && alreadyRegistered && (
                      <form onSubmit={handleReviewSubmit} style={{ marginBottom: '2rem', background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '12px' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label>{t('eventDetail.ratingLabel', 'Đánh giá')}:</label>
                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.5rem', cursor: 'pointer' }}>
                            {[1,2,3,4,5].map(s => <span key={s} onClick={() => setRating(s)} style={{ filter: s <= rating ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>)}
                          </div>
                        </div>
                        <textarea required value={comment} onChange={e => setComment(e.target.value)} placeholder={t('eventDetail.reviewPlaceholder', 'Chia sẻ cảm nhận của bạn...')} 
                          style={{ width: '100%', padding: '1rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', minHeight: '100px' }} />
                        <button type="submit" className="btn-register" style={{ marginTop: '1rem', width: 'auto' }}>{t('eventDetail.submitReview')}</button>
                      </form>
                    )}

                    {reviews.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>{t('eventDetail.noReviewsYet')}</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {reviews.map(rev => (
                          <div key={rev._id} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>{rev.userFullName}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div style={{ color: '#facc15', margin: '0.5rem 0' }}>{'⭐'.repeat(rev.rating)}</div>
                            <p>{rev.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'forum' && <EventForum eventId={id} />}
              {activeTab === 'polls' && <EventPolls eventId={id} isOrganizer={user?._id === event.organizerId || user?.role === 'ADMIN'} />}
            </div>
            
            {/* 🎯 SIMILAR EVENTS */}
            {similar.length > 0 && (
              <div style={{ marginTop: '4rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>🎯 {t('eventDetail.similarEvents')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  {similar.map(ev => (
                    <Link key={ev._id} to={`/events/${ev._id}`} className="similar-card" style={{ textDecoration: 'none', background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', transition: 'all 0.3s' }}>
                      <img src={getImageUrl(ev.bannerImagePath)} alt={ev.title} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.75rem' }} onError={e => e.target.src = '/placeholder.png'} />
                      <h4 style={{ color: 'var(--text-primary)', margin: '0' }}>{ev.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>📍 {ev.location} • 📅 {new Date(ev.startDate).toLocaleDateString()}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
