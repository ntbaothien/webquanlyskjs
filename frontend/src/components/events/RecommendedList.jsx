import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function RecommendedList() {
  const { token, user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API}/events/recommended`, { headers })
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading || events.length === 0) return null;

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800 }}>
            {user ? '✨ Dành riêng cho bạn' : '🔥 Sự kiện nổi bật'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {user
              ? 'Được gợi ý dựa trên lịch sử & sở thích của bạn'
              : 'Những sự kiện được tham gia nhiều nhất'}
          </p>
        </div>
        <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--purple)', fontWeight: 600, textDecoration: 'none' }}>
          Xem tất cả →
        </Link>
      </div>

      {/* Horizontal Scroll Carousel */}
      <div style={{
        display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.75rem',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-bg)'
      }}>
        {events.map(event => (
          <RecommendCard key={event._id} event={event} />
        ))}
      </div>
    </section>
  );
}

function RecommendCard({ event }) {
  const minPrice = event.free
    ? 0
    : Math.min(...(event.seatZones || []).map(z => z.price).filter(p => p > 0), Infinity);

  return (
    <Link to={`/events/${event._id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
      <div style={{
        width: '240px', borderRadius: '16px', overflow: 'hidden',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)', transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = 'var(--card-hover-shadow)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = 'var(--shadow)';
        }}
      >
        {/* Banner */}
        <div style={{ position: 'relative', height: '130px', overflow: 'hidden', background: 'var(--bg-input)' }}>
          {event.bannerImagePath ? (
            <img
              src={`http://localhost:5000${event.bannerImagePath}`}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
            }}>🎪</div>
          )}
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 50%)'
          }} />
          {/* Category badge */}
          {event.category && (
            <div style={{
              position: 'absolute', top: '0.5rem', left: '0.5rem',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              borderRadius: '20px', padding: '0.2rem 0.6rem',
              fontSize: '0.65rem', fontWeight: 600, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              {event.category}
            </div>
          )}
          {/* Featured badge */}
          {event.isFeatured && (
            <div style={{
              position: 'absolute', top: '0.5rem', right: '0.5rem',
              background: 'rgba(233,69,96,0.8)', borderRadius: '20px',
              padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, color: '#fff'
            }}>⭐ Nổi bật</div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '0.85rem' }}>
          <h4 style={{
            margin: '0 0 0.4rem', fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {event.title}
          </h4>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>📅</span>
            <span>{formatDate(event.startDate) || 'Chưa xác định'}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.location}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {event.free ? (
                <span style={{
                  fontWeight: 700, fontSize: '0.85rem',
                  background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                  padding: '0.2rem 0.55rem', borderRadius: '20px'
                }}>Miễn phí</span>
              ) : (
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--purple)' }}>
                  {minPrice === Infinity ? 'Có phí' : `Từ ${minPrice.toLocaleString('vi-VN')}đ`}
                </span>
              )}
            </div>
            {event.currentAttendees > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                👥 {event.currentAttendees}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
