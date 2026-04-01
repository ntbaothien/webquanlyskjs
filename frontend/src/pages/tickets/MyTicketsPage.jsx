import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function MyTicketsPage() {
  const location = useLocation();
  const successMsg = location.state?.message;

  const [regs, setRegs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(successMsg || '');
  const [tab, setTab] = useState('all');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [regRes, bookRes, ticketRes] = await Promise.all([
        axiosInstance.get('/my-registrations'),
        axiosInstance.get('/my-bookings'),
        axiosInstance.get('/my-tickets').catch(() => ({ data: { tickets: [] } })),
      ]);
      setRegs(regRes.data || []);
      setBookings(bookRes.data || []);
      setTickets(ticketRes.data?.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCancelReg = async (regId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đăng ký không?')) return;
    try {
      await axiosInstance.delete(`/registrations/${regId}`);
      setMsg('Đã hủy đăng ký thành công');
      fetchAll();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Hủy thất bại');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Hủy vé sẽ được hoàn tiền vào số dư. Xác nhận?')) return;
    try {
      await axiosInstance.delete(`/bookings/${bookingId}`);
      setMsg('Đã hủy vé và hoàn tiền thành công');
      fetchAll();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Hủy thất bại');
    }
  };

  // Find tickets for a registration/booking
  const getTicketsFor = (type, id) => {
    if (type === 'reg') return tickets.filter(t => t.registrationId === id);
    return tickets.filter(t => t.bookingId === id);
  };

  const visible = tab === 'all'
    ? { regs, bookings }
    : tab === 'free'
    ? { regs, bookings: [] }
    : { regs: [], bookings };

  const total = visible.regs.length + visible.bookings.length;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <h1 className="page-title">🎟 Vé & Đặt chỗ của tôi</h1>

        {msg && (
          <div className="msg-box success" style={{ marginBottom: '1.25rem' }}>{msg}</div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'all', label: `Tất cả (${regs.length + bookings.length})` },
            { key: 'free', label: `🆓 Miễn phí (${regs.length})` },
            { key: 'paid', label: `💳 Có phí (${bookings.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '20px',
              border: `1px solid ${tab === t.key ? '#6c63ff' : 'rgba(255,255,255,0.15)'}`,
              background: tab === t.key ? 'rgba(108,99,255,0.2)' : 'transparent',
              color: tab === t.key ? '#a78bfa' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontWeight: tab === t.key ? 700 : 400,
              transition: 'all 0.2s', fontSize: '0.9rem'
            }}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">⏳ Đang tải...</div>
        ) : total === 0 ? (
          <div className="empty-state">😔 Chưa có vé nào</div>
        ) : (
          <div className="reg-grid">
            {/* Đăng ký miễn phí */}
            {visible.regs.map(r => {
              const rTickets = getTicketsFor('reg', r._id);
              return (
                <div key={r._id || r.id} className="reg-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 10px', borderRadius: '20px',
                      background: 'rgba(76,175,80,0.15)', color: '#81c784',
                      border: '1px solid rgba(76,175,80,0.3)', fontWeight: 600
                    }}>🆓 Miễn phí</span>
                    <span className={`reg-status-${r.status?.toLowerCase()}`}>{r.status}</span>
                  </div>
                  <h4>{r.eventTitle || 'Sự kiện'}</h4>
                  <p className="event-meta">📍 {r.eventLocation || '—'}</p>
                  <p className="event-meta">📅 {r.eventStartDate ? new Date(r.eventStartDate).toLocaleDateString('vi-VN') : '—'}</p>
                  <p className="event-meta" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    Đăng ký: {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString('vi-VN') : '—'}
                  </p>

                  {/* QR Ticket buttons */}
                  {rTickets.length > 0 && r.status === 'CONFIRMED' && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {rTickets.map(t => (
                        <Link key={t._id} to={`/tickets/${t.ticketCode}`}
                          className="btn-sm btn-info" style={{ textDecoration: 'none', fontSize: '0.75rem' }}>
                          📱 {t.ticketCode}
                        </Link>
                      ))}
                    </div>
                  )}

                  {r.status === 'CONFIRMED' && (
                    <button className="btn-sm btn-danger" style={{ marginTop: '0.75rem' }}
                      onClick={() => handleCancelReg(r._id || r.id)}>Hủy đăng ký</button>
                  )}
                </div>
              );
            })}

            {/* Vé có phí */}
            {visible.bookings.map(b => {
              const bTickets = getTicketsFor('booking', b._id);
              return (
                <div key={b._id || b.id} className="reg-card" style={{ borderColor: 'rgba(167,139,250,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 10px', borderRadius: '20px',
                      background: 'rgba(255,193,7,0.15)', color: '#ffc107',
                      border: '1px solid rgba(255,193,7,0.3)', fontWeight: 600
                    }}>💳 Có phí</span>
                    <span className={`reg-status-${b.status?.toLowerCase()}`}>{b.status}</span>
                  </div>
                  <h4>{b.eventTitle || 'Sự kiện'}</h4>
                  <p className="event-meta">🪑 Khu: <strong style={{ color: '#a78bfa' }}>{b.zoneName}</strong></p>
                  <p className="event-meta">🎟 Số lượng: <strong>{b.quantity} vé</strong></p>
                  <p className="event-meta" style={{ color: '#a78bfa', fontWeight: 700 }}>
                    💰 {(b.finalAmount || b.totalPrice)?.toLocaleString('vi-VN')}đ
                  </p>
                  <p className="event-meta" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    Đặt: {b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </p>

                  {/* QR Ticket buttons */}
                  {bTickets.length > 0 && b.status === 'CONFIRMED' && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {bTickets.map(t => (
                        <Link key={t._id} to={`/tickets/${t.ticketCode}`}
                          className="btn-sm btn-info" style={{ textDecoration: 'none', fontSize: '0.75rem' }}>
                          📱 {t.ticketCode}
                        </Link>
                      ))}
                    </div>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <button className="btn-sm btn-danger" style={{ marginTop: '0.75rem' }}
                      onClick={() => handleCancelBooking(b._id || b.id)}>Hủy & Hoàn tiền</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
