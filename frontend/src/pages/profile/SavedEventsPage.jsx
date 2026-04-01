import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

export default function SavedEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    try {
      const { data } = await axiosInstance.get('/users/me/saved');
      setEvents(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (e, id) => {
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/users/me/saved/${id}`);
      setEvents(events.filter(ev => ev._id !== id));
    } catch {}
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container page-content">
        <h2 className="mb-32">❤️ Sự kiện đã lưu</h2>
        
        {events.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>💔</div>
            <h3>Bạn chưa có sự kiện yêu thích nào</h3>
            <button className="btn btn-primary mt-16" onClick={() => navigate('/')}>
              Khám phá sự kiện
            </button>
          </div>
        ) : (
          <div className="grid grid-events">
            {events.map((event) => (
              <div key={event._id} className="event-card" onClick={() => navigate(`/events/${event._id}`)}>
                {event.images?.[0] ? (
                  <img src={event.images[0]} alt={event.title} className="event-card-img" />
                ) : (
                  <div className="event-card-img-placeholder">🎉</div>
                )}
                <div className="event-card-body relative">
                  <button 
                    className="btn btn-icon" 
                    style={{ position: 'absolute', top: -20, right: 16, background: 'var(--bg-card)', borderRadius: '50%', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                    onClick={(e) => handleUnsave(e, event._id)}
                    title="Bỏ lưu"
                  >
                    ❤️
                  </button>
                  <div className="flex gap-8 mb-8 mt-4">
                    <span className="badge badge-purple">{event.category}</span>
                  </div>
                  <h3 className="event-card-title">{event.title}</h3>
                  <div className="event-card-meta mt-8">
                    <span>📅 {formatDate(event.startTime)}</span>
                  </div>
                  {event.location && (
                    <div className="event-card-meta">
                      <span className="truncate">📍 {event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
