import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function TicketQRPage() {
  const { code } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    axiosInstance.get(`/tickets/${code}`)
      .then(r => setTicket(r.data))
      .catch(err => setError(err.response?.data?.error || 'Không tìm thấy vé'))
      .finally(() => setLoading(false));
  }, [code]);

  const downloadTicket = async () => {
    try {
      const el = document.getElementById('ticket-card');
      if (!el) return;
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, { backgroundColor: '#0f0f23' });
      const link = document.createElement('a');
      link.download = `ticket-${code}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  if (loading) return <><Navbar /><div className="loading-state">⏳ Đang tải vé...</div></>;
  if (error) return (
    <><Navbar />
      <div className="page-container">
        <div className="empty-state">❌ {error}</div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/my-registrations" className="btn-register" style={{ display: 'inline-block', textDecoration: 'none' }}>← Quay lại</Link>
        </div>
      </div>
    </>
  );

  const statusColors = { ACTIVE: '#86efac', USED: '#fde047', CANCELLED: '#fca5a5' };
  const statusLabels = { ACTIVE: '✅ Hợp lệ', USED: '☑️ Đã sử dụng', CANCELLED: '❌ Đã hủy' };

  return (
    <>
      <Navbar />
      <div className="page-container" style={{ maxWidth: 500, margin: '0 auto', padding: '2rem' }}>
        <div id="ticket-card" className="ticket-qr-card">
          {/* Header */}
          <div className="ticket-qr-header">
            <div className="ticket-qr-logo">🎪 EventHub</div>
            <div className="ticket-qr-status" style={{ color: statusColors[ticket.status] }}>
              {statusLabels[ticket.status] || ticket.status}
            </div>
          </div>

          {/* Event Info */}
          <div className="ticket-qr-event">
            <h2>{ticket.eventTitle}</h2>
            <div className="ticket-qr-meta">
              <span>🪑 Khu vực: <strong style={{ color: '#a78bfa' }}>{ticket.zoneName}</strong></span>
              {ticket.eventDate && (
                <span>📅 {new Date(ticket.eventDate).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
              <span>👤 {ticket.userFullName}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="ticket-qr-code-wrap">
            <QRCodeSVG
              value={`EVENTHUB:${ticket.ticketCode}`}
              size={200}
              bgColor="#ffffff"
              fgColor="#1a1a2e"
              level="H"
              includeMargin
              className="ticket-qr-svg"
            />
          </div>

          {/* Ticket Code */}
          <div className="ticket-qr-ticket-code">
            {ticket.ticketCode}
          </div>

          {/* Used timestamp */}
          {ticket.usedAt && (
            <div style={{ textAlign: 'center', color: '#fde047', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Check-in lúc: {new Date(ticket.usedAt).toLocaleString('vi-VN')}
            </div>
          )}

          {/* Barcode-style decoration */}
          <div className="ticket-qr-barcode">
            {Array.from({ length: 30 }, (_, i) => (
              <div key={i} style={{ width: Math.random() > 0.5 ? 3 : 2, height: 30, background: 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button onClick={downloadTicket} className="btn-register" style={{ flex: 1 }}>
            📥 Tải vé (PNG)
          </button>
          <Link to="/my-registrations" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
            ← Quay lại
          </Link>
        </div>
      </div>
    </>
  );
}
