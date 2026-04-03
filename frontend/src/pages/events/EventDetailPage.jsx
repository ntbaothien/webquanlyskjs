import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
      <button onClick={copyLink} className="share-btn share-copy">{copied ? '✅ Copied!' : '🔗 Copy link'}</button>
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
                  📅 {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {event.endDate && ` → ${new Date(event.endDate).toLocaleDateString('en-US')}`}
                </p>
                <p className="event-meta">⏰ {new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="event-meta">👤 {t('eventDetail.organizedBy')}: <strong>{event.organizerName}</strong></p>

                {/* ⏳ COUNTDOWN */}
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

                {eventPast && (
                  <div className="event-past-alert">
                    🏁 {t('eventDetail.eventHasEnded')}
                  </div>
                )}
              </div>

              <div className="event-detail-sidebar">
                {/* Spots box */}
                {!isPaid ? (
                  <div className="spots-box">
                    <div className="spots-number">{spotsLeft === 2147483647 ? '∞' : spotsLeft}</div>
                    <div className="spots-label">{t('eventDetail.spotsAvailable')}</div>
                  </div>
                ) : (
                  <div className="spots-box">
                    <div className="spots-number">{totalAvailablePaid}</div>
                    <div className="spots-label">{t('eventDetail.totalSeats')}</div>
                  </div>
                )}

                {message && <div className={`msg-box ${msgType}`}>{message}</div>}

                {event.status === 'PUBLISHED' && user?.role === 'ATTENDEE' && !eventPast && (
                  <>
                    {!isPaid && !alreadyRegistered && (
                      <button className="btn-register" onClick={handleRegister} disabled={spotsLeft === 0}>
                        {spotsLeft === 0 ? `❌ ${t('eventDetail.soldOut')}` : `🎟 ${t('eventDetail.registerFree')}`}
                      </button>
                    )}
                    {!isPaid && alreadyRegistered && (
                      <div className="msg-box success">✅ {t('eventDetail.youRegistered')}</div>
                    )}
                    {isPaid && totalAvailablePaid > 0 && (
                      <button className="btn-register btn-paid" onClick={() => navigate(`/events/${id}/book`)}>
                        🪑 {t('eventDetail.selectSeatsBook')}
                      </button>
                    )}
                    {isPaid && totalAvailablePaid === 0 && (
                      <button className="btn-register" disabled>❌ {t('eventDetail.ticketsSoldOut')}</button>
                    )}
                  </>
                )}

                {event.status === 'PUBLISHED' && eventPast && (
                  <button className="btn-register" disabled style={{ opacity: 0.5 }}>
                    🏁 {t('eventDetail.eventHasEnded')}
                  </button>
                )}

                {!user && event.status === 'PUBLISHED' && !eventPast && (
                  <button className="btn-register" onClick={() => navigate('/login')}>
                    🔐 {isPaid ? t('eventDetail.loginToBuy') : t('eventDetail.loginToRegister')}
                  </button>
                )}

                {/* 📅 Google Calendar + ❤️ Save */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <a href={getGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                    📅 {t('eventDetail.googleCalendar')}
                  </a>
                  <button onClick={handleSave} className="btn-secondary" style={{ flex: 1 }}>
                    {saved ? `❤️ ${t('eventDetail.savedEvent')}` : `🤍 ${t('eventDetail.saveEvent')}`}
                  </button>
                </div>
              </div>
            </div>

            {/* Zones info for paid events */}
            {isPaid && event.seatZones?.length > 0 && (
              <div style={{ margin: '1.5rem 0' }}>
                <h3 style={{ marginBottom: '1rem' }}>🗺️ {t('eventDetail.zonesTickets')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {event.seatZones.map(zone => {
                    const available = Math.max(0, zone.totalSeats - zone.soldSeats);
                    const pct = zone.totalSeats > 0 ? (zone.soldSeats / zone.totalSeats) * 100 : 0;
                    return (
                      <div key={zone._id || zone.id} className="ticket-zone-card" style={{ borderLeftColor: zone.color || '#6c63ff' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: zone.color || 'var(--text-primary)' }}>{zone.name}</div>
                        {zone.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>{zone.description}</div>}
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', margin: '0.5rem 0' }}>
                          {zone.price === 0 ? t('eventDetail.free') : `$${zone.price.toLocaleString('en-US')}`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: available <= 5 ? '#ef4444' : 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          {available <= 5 && available > 0 ? `⚡ ${t('eventDetail.onlySeatsLeft', { count: available })}` : `${available} / ${zone.totalSeats} seats`}
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
              <h3>{t('eventDetail.eventDescription')}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
            </div>
            {event.tags?.length > 0 && (
              <div className="event-tags">
                {event.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}

            {/* 📢 SHARE BUTTONS */}
            <div style={{ margin: '1.5rem 0', padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>📢 {t('eventDetail.shareEvent')}</h4>
              <ShareButtons event={event} eventId={id} />
            </div>

            {/* ⭐ REVIEWS */}
            <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />
            <div className="event-reviews">
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                ⭐ {t('eventDetail.reviewsFeedback')}
                <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                  ({reviews.length} {reviews.length === 1 ? t('eventDetail.review') : t('eventDetail.reviews')}{avgRating ? ` • ${avgRating}/5` : ''})
                </span>
              </h3>

              {event.endDate && new Date(event.endDate) < new Date() && user?.role === 'ATTENDEE' && (
                <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t('eventDetail.shareYourReview')}</h4>
                  {reviewMsg.text && (
                    <div className={`msg-box ${reviewMsg.type}`} style={{ marginBottom: '1rem' }}>{reviewMsg.text}</div>
                  )}
                  <form onSubmit={handleReviewSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('eventDetail.rating')}:</label>
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
                          placeholder={t('eventDetail.sharePlaceholder')}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', minHeight: '100px' }}
                        />
                    </div>
                    <button type="submit" className="btn-register" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                      {t('eventDetail.submitReview')}
                    </button>
                  </form>
                </div>
              )}

              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('eventDetail.noReviewsYet')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reviews.map(rev => (
                    <div key={rev._id || rev.id} style={{ background: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: '8px', borderLeft: '3px solid #6c63ff', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{rev.userFullName}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(rev.createdAt).toLocaleString('en-US')}
                        </span>
                      </div>
                      <div style={{ color: '#facc15', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        {'⭐'.repeat(rev.rating)}
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🎯 SIMILAR EVENTS */}
            {similar.length > 0 && (
              <>
                <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />
                <div>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>🎯 {t('eventDetail.similarEvents')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {similar.map(ev => (
                      <Link key={ev._id} to={`/events/${ev._id}`}
                        style={{ textDecoration: 'none', background: 'var(--bg-card)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                        className="similar-card">
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.4rem', fontSize: '0.95rem' }}>{ev.title}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                          📍 {ev.location} • 📅 {new Date(ev.startDate).toLocaleDateString('en-US')}
                        </p>
                        <div style={{ marginTop: '0.5rem' }}>
                          {ev.free ? (
                            <span style={{ fontSize: '0.75rem', color: '#81c784', background: 'rgba(76,175,80,0.15)', padding: '2px 8px', borderRadius: '10px' }}>{t('eventDetail.free')}</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#ffc107', background: 'rgba(255,193,7,0.15)', padding: '2px 8px', borderRadius: '10px' }}>{t('eventDetail.paid')}</span>
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
