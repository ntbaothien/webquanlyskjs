import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function MyTicketsPage() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const successMsg = location.state?.message;

  const [regs, setRegs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(successMsg || '');
  const [tab, setTab] = useState('all');

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

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
    if (!window.confirm(t('tickets.cancelRegConfirm'))) return;
    try {
      await axiosInstance.delete(`/registrations/${regId}`);
      setMsg(t('tickets.cancelSuccess'));
      fetchAll();
    } catch (err) {
      setMsg(err.response?.data?.error || t('tickets.cancelFailed'));
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(t('tickets.cancelRefundConfirm'))) return;
    try {
      await axiosInstance.delete(`/bookings/${bookingId}`);
      setMsg(t('tickets.cancelBookingSuccess'));
      fetchAll();
    } catch (err) {
      setMsg(err.response?.data?.error || t('tickets.cancelFailed'));
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
        <h1 className="page-title">{t('tickets.myTicketsTitle')}</h1>

        {msg && (
          <div className="msg-box success" style={{ marginBottom: '1.25rem' }}>{msg}</div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'all',  label: `${t('tickets.allTab')} (${regs.length + bookings.length})` },
            { key: 'free', label: `${t('tickets.freeTab')} (${regs.length})` },
            { key: 'paid', label: `${t('tickets.paidTab')} (${bookings.length})` },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className={`ticket-tab-btn${tab === item.key ? ' active' : ''}`}>
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">⏳ {t('common.loading')}</div>
        ) : total === 0 ? (
          <div className="empty-state">😔 {t('tickets.noTickets')}</div>
        ) : (
          <div className="reg-grid">
            {/* Free registrations */}
            {visible.regs.map(r => {
              const rTickets = getTicketsFor('reg', r._id);
              return (
                <div key={r._id || r.id} className="reg-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 10px', borderRadius: '20px',
                      background: 'rgba(76,175,80,0.15)', color: '#81c784',
                      border: '1px solid rgba(76,175,80,0.3)', fontWeight: 600
                    }}>🆓 {t('events.free')}</span>
                    <span className={`reg-status-${r.status?.toLowerCase()}`}>{r.status}</span>
                  </div>
                  <h4>{r.eventTitle || t('nav.events')}</h4>
                  <p className="event-meta">📍 {r.eventLocation || '—'}</p>
                  <p className="event-meta">📅 {r.eventStartDate ? new Date(r.eventStartDate).toLocaleDateString(locale) : '—'}</p>
                  <p className="event-meta" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {t('tickets.registeredAt')}: {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString(locale) : '—'}
                  </p>

                  {/* QR Ticket buttons */}
                  {rTickets.length > 0 && r.status === 'CONFIRMED' && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {rTickets.map(tk => (
                        <Link key={tk._id} to={`/tickets/${tk.ticketCode}`}
                          className="btn-sm btn-info" style={{ textDecoration: 'none', fontSize: '0.75rem' }}>
                          📱 {tk.ticketCode}
                        </Link>
                      ))}
                    </div>
                  )}

                  {r.status === 'CONFIRMED' && (
                    <button className="btn-sm btn-danger" style={{ marginTop: '0.75rem' }}
                      onClick={() => handleCancelReg(r._id || r.id)}>{t('tickets.cancelReg')}</button>
                  )}
                </div>
              );
            })}

            {/* Paid bookings */}
            {visible.bookings.map(b => {
              const bTickets = getTicketsFor('booking', b._id);
              return (
                <div key={b._id || b.id} className="reg-card" style={{ borderColor: 'rgba(167,139,250,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 10px', borderRadius: '20px',
                      background: 'rgba(255,193,7,0.15)', color: '#ffc107',
                      border: '1px solid rgba(255,193,7,0.3)', fontWeight: 600
                    }}>💳 {t('events.paid')}</span>
                    <span className={`reg-status-${b.status?.toLowerCase()}`}>{b.status}</span>
                  </div>
                  <h4>{b.eventTitle || t('nav.events')}</h4>
                  <p className="event-meta">🪑 {t('tickets.zone')}: <strong style={{ color: 'var(--purple)' }}>{b.zoneName}</strong></p>
                  <p className="event-meta">🎟 {t('tickets.quantity')}: <strong>{b.quantity} {t('tickets.title').toLowerCase()}</strong></p>
                  <p className="event-meta" style={{ color: 'var(--purple)', fontWeight: 700 }}>
                    💰 {(b.finalAmount || b.totalPrice)?.toLocaleString(locale)}đ
                  </p>
                  <p className="event-meta" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {t('tickets.bookedAt')}: {b.createdAt ? new Date(b.createdAt).toLocaleDateString(locale) : '—'}
                  </p>

                  {/* QR Ticket buttons */}
                  {bTickets.length > 0 && b.status === 'CONFIRMED' && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {bTickets.map(tk => (
                        <Link key={tk._id} to={`/tickets/${tk.ticketCode}`}
                          className="btn-sm btn-info" style={{ textDecoration: 'none', fontSize: '0.75rem' }}>
                          📱 {tk.ticketCode}
                        </Link>
                      ))}
                    </div>
                  )}

                  {b.status === 'CONFIRMED' && (
                    <button className="btn-sm btn-danger" style={{ marginTop: '0.75rem' }}
                      onClick={() => handleCancelBooking(b._id || b.id)}>{t('tickets.cancelAndRefund')}</button>
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
