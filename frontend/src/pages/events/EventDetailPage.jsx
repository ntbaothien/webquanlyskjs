import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [isSaved, setIsSaved] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [evRes, ttRes, rvRes] = await Promise.all([
          axiosInstance.get(`/events/${id}`),
          axiosInstance.get(`/events/${id}/ticket-types`),
          axiosInstance.get(`/events/${id}/reviews`),
        ]);
        setEvent(evRes.data.data);
        setTicketTypes(ttRes.data.data);
        setReviews(rvRes.data.data.items || []);
        setAvgRating(rvRes.data.data.avgRating || 0);
      } catch { navigate('/'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!user) return navigate('/login');
    try {
      if (isSaved) {
        await axiosInstance.delete(`/users/me/saved/${id}`);
        setIsSaved(false);
      } else {
        await axiosInstance.post(`/users/me/saved/${id}`);
        setIsSaved(true);
      }
    } catch {}
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setReviewError('');
    try {
      await axiosInstance.post(`/events/${id}/reviews`, newReview);
      const { data } = await axiosInstance.get(`/events/${id}/reviews`);
      setReviews(data.data.items || []);
      setAvgRating(data.data.avgRating || 0);
      setNewReview({ rating: 5, comment: '' });
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Không thể đăng đánh giá');
    }
  };

  if (loading) return <div className="loading-center" style={{ marginTop: 80 }}><div className="spinner" /></div>;
  if (!event) return null;

  const mapLink = event.latitude ? `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}` : null;

  return (
    <div className="page">
      {/* Hero Image */}
      <div style={{ width: '100%', height: 360, background: 'var(--bg-card2)', position: 'relative', overflow: 'hidden' }}>
        {event.images?.[0]
          ? <img src={event.images[0]} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div className="flex-center" style={{ height: '100%', fontSize: '5rem' }}>🎉</div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
      </div>

      <div className="container" style={{ marginTop: -60, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
          {/* Left */}
          <div>
            <div className="flex gap-8 mb-12">
              <span className="badge badge-blue">{event.category}</span>
              <span className={`badge ${event.status === 'Published' ? 'badge-green' : 'badge-red'}`}>{event.status}</span>
            </div>
            <h1 style={{ marginBottom: 12 }}>{event.title}</h1>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>📅 {formatDate(event.startTime)}</span>
              {event.location && <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>📍 {event.location}</span>}
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>👁 {event.viewCount || 0} lượt xem</span>
              {avgRating > 0 && <span style={{ color: 'var(--warning)', fontSize: 14, fontWeight: 700 }}>⭐ {avgRating}/5</span>}
            </div>

            {/* Tabs */}
            <div className="tabs mb-24">
              {['info', 'reviews'].map(t => (
                <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'info' ? '📋 Thông tin' : `⭐ Đánh giá (${reviews.length})`}
                </button>
              ))}
            </div>

            {tab === 'info' && (
              <div>
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 className="mb-16">Mô tả sự kiện</h3>
                  <p style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{event.description || 'Chưa có mô tả.'}</p>
                </div>
                {mapLink && (
                  <div className="card">
                    <h3 className="mb-12">📍 Địa điểm</h3>
                    <p style={{ marginBottom: 12 }}>{event.location}</p>
                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                      🗺 Xem bản đồ
                    </a>
                  </div>
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <div>
                {/* Add review */}
                {user && (
                  <div className="card mb-20">
                    <h3 className="mb-12">Viết đánh giá</h3>
                    <form onSubmit={submitReview} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {reviewError && <div className="alert alert-error">{reviewError}</div>}
                      <div>
                        <label className="form-label">Rating</label>
                        <div className="stars" style={{ marginTop: 6 }}>
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className="star" style={{ color: s <= newReview.rating ? '#fa8231' : 'var(--text-dim)' }}
                              onClick={() => setNewReview({ ...newReview, rating: s })}>★</span>
                          ))}
                        </div>
                      </div>
                      <textarea className="form-input" placeholder="Chia sẻ cảm nhận của bạn..."
                        value={newReview.comment} onChange={e => setNewReview({ ...newReview, comment: e.target.value })} />
                      <button className="btn btn-primary" type="submit">Gửi đánh giá</button>
                    </form>
                  </div>
                )}
                {reviews.length === 0
                  ? <div className="text-center" style={{ padding: 40 }}><p>Chưa có đánh giá nào</p></div>
                  : reviews.map(r => (
                    <div key={r._id} className="card mb-12">
                      <div className="flex gap-12" style={{ alignItems: 'center', marginBottom: 8 }}>
                        <div className="avatar">{r.userId?.fullName?.[0] || 'U'}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.userId?.fullName}</div>
                          <div style={{ color: 'var(--warning)', fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div>
                        </div>
                        {r.isVerifiedAttendee && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>✓ Đã tham dự</span>}
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{r.comment}</p>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Right - Ticket Sidebar */}
          <div style={{ position: 'sticky', top: 'calc(var(--header-h) + 20px)' }}>
            <div className="card-glass" style={{ padding: 24 }}>
              <h3 className="mb-16">🎫 Chọn vé</h3>
              {ticketTypes.length === 0 ? (
                <div className="text-center" style={{ padding: 20 }}><p>Chưa có loại vé</p></div>
              ) : (
                ticketTypes.map(tt => (
                  <div key={tt._id} className="card mb-12" style={{ padding: '14px 16px', cursor: 'pointer' }}
                    onClick={() => navigate(`/checkout/${event._id}`, { state: { ticketType: tt } })}>
                    <div className="flex-between">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{tt.name}</div>
                        {tt.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tt.description}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary-light)' }}>
                          {tt.price === 0 ? 'Miễn phí' : `${tt.price.toLocaleString('vi-VN')}đ`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Còn {tt.quantity - tt.sold}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button className="btn btn-ghost w-full btn-sm mt-8" onClick={handleSave}>
                {isSaved ? '💔 Bỏ lưu' : '❤️ Lưu sự kiện'}
              </button>
            </div>

            {/* Organizer */}
            {event.createdBy && (
              <div className="card mt-16" style={{ padding: '16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Người tổ chức</div>
                <div className="flex gap-12">
                  <div className="avatar">{event.createdBy.fullName?.[0] || 'O'}</div>
                  <div><div style={{ fontWeight: 600 }}>{event.createdBy.fullName}</div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
