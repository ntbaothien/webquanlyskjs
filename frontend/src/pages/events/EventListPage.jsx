import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

const CATEGORIES = ['All', 'Music', 'Sports', 'Conference', 'Exhibition', 'Festival', 'Workshop', 'Comedy', 'Theater', 'Food', 'Other'];

const statusBadge = (status) => {
  const map = { Published: 'badge-green', Draft: 'badge-purple', Cancelled: 'badge-red', Ended: 'badge-orange' };
  return <span className={`badge ${map[status] || 'badge-blue'}`}>{status}</span>;
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function EventListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      const { data } = await axiosInstance.get('/events', { params });
      setEvents(data.data.items);
      setPagination(data.data.pagination);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [page, category]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchEvents(); }, 600);
    return () => clearTimeout(t);
  }, [search]);

  const formatPrice = (event) => {
    // Lấy giá thấp nhất từ ticket types nếu có
    return 'Xem chi tiết';
  };

  return (
    <div className="page">
      {/* Hero */}
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="badge badge-purple mb-16" style={{ display: 'inline-flex' }}>🔥 Sự kiện nổi bật</div>
          <h1 style={{ marginBottom: 16 }}>
            Khám phá <span className="gradient-text">Sự kiện</span> <br />
            gần bạn hôm nay
          </h1>
          <p style={{ fontSize: 18, maxWidth: 480, margin: '0 auto 32px' }}>
            Hàng nghìn sự kiện đang chờ bạn — âm nhạc, thể thao, hội thảo và nhiều hơn nữa
          </p>

          {/* Search */}
          <div className="search-bar" style={{ maxWidth: 560, margin: '0 auto' }}>
            <span className="search-icon">🔍</span>
            <input className="form-input" placeholder="Tìm kiếm sự kiện, địa điểm..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: 60 }}>
        {/* Category Chips */}
        <div className="flex" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 32, marginTop: 8 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} className={`chip ${category === cat ? 'active' : ''}`}
              onClick={() => { setCategory(cat); setPage(1); }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎭</div>
            <h3>Không tìm thấy sự kiện nào</h3>
            <p className="mt-8">Hãy thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div className="grid grid-events">
            {events.map((event, i) => (
              <div key={event._id} className="event-card animate-in" style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => navigate(`/events/${event._id}`)}>
                {event.images?.[0]
                  ? <img src={event.images[0]} alt={event.title} className="event-card-img" />
                  : <div className="event-card-img-placeholder">
                      {event.category === 'Music' ? '🎵' : event.category === 'Sports' ? '⚽' : event.category === 'Conference' ? '🎤' : '🎉'}
                    </div>
                }
                <div className="event-card-body">
                  <div className="flex-between mb-8">
                    {statusBadge(event.status)}
                    <span className="badge badge-blue">{event.category}</span>
                  </div>
                  <div className="event-card-title">{event.title}</div>
                  <div className="event-card-meta">📅 {formatDate(event.startTime)}</div>
                  {event.location && <div className="event-card-meta">📍 {event.location}</div>}
                  <div className="flex-between mt-16">
                    <span className="event-card-price">{formatPrice(event)}</span>
                    <div className="flex gap-8" style={{ alignItems: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
                      👁 {event.viewCount || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex-center" style={{ gap: 8, marginTop: 40 }}>
            <button className="btn btn-secondary btn-sm" disabled={!pagination.hasPrevPage}
              onClick={() => setPage(p => p - 1)}>← Trước</button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
              .map((p, i, arr) => (
                <span key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && <span style={{ color: 'var(--text-dim)' }}>...</span>}
                  <button className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage(p)}>{p}</button>
                </span>
              ))}
            <button className="btn btn-secondary btn-sm" disabled={!pagination.hasNextPage}
              onClick={() => setPage(p => p + 1)}>Sau →</button>
          </div>
        )}
      </div>
    </div>
  );
}
