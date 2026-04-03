import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import EmailReminderWidget from '../../components/common/EmailReminderWidget';
import '../events/Events.css';

export default function EventEmailRemindersPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const { data } = await axiosInstance.get(`/organizer/my-events`);
        const found = data.content?.find(e => String(e.id) === String(eventId));
        if (found) {
          setEvent(found);
        } else {
          navigate('/organizer/my-events');
        }
      } catch (e) {
        console.error(e);
        navigate('/organizer/my-events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId, navigate]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="page-container">
          <div className="loading-state">⏳ Đang tải...</div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="page-container">
          <div className="empty-state">Không tìm thấy sự kiện</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/organizer/my-events')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64c8ff',
              cursor: 'pointer',
              fontSize: '0.95rem',
              marginBottom: '1rem'
            }}
          >
            ← Quay lại
          </button>
          <h1 className="page-title" style={{ margin: '0 0 0.5rem 0' }}>
            📧 Quản lý Email Nhắc Nhở
          </h1>
          <p style={{ color: '#a0a0a0', margin: 0 }}>
            Sự kiện: <strong>{event.title}</strong>
          </p>
        </div>

        <EmailReminderWidget eventId={eventId} />
      </div>
    </>
  );
}
