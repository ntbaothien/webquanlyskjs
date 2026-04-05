import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function TicketQRPage() {
  const { code } = useParams();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!code) return;
    axiosInstance.get(`/tickets/${code}`)
      .then(r => setTicket(r.data))
      .catch(err => setError(err.response?.data?.error || t('common.error')))
      .finally(() => setLoading(false));
  }, [code, t]);

  const downloadPNG = async () => {
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
      console.error('Download PNG error:', e);
      addToast(t('common.error'), 'error');
    }
  };

  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [100, 180] // Ticket ratio
      });

      // Background
      doc.setFillColor(15, 15, 26);
      doc.rect(0, 0, 100, 180, 'F');

      // Header
      doc.setFillColor(233, 69, 96);
      doc.rect(0, 0, 100, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('EventHub Ticket', 50, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(ticket.status, 50, 22, { align: 'center' });

      // Event Info
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(ticket.eventTitle, 10, 45, { maxWidth: 80 });

      doc.setFontSize(10);
      doc.setTextColor(167, 139, 250);
      doc.text(`${t('tickets.area')}: ${ticket.zoneName || ''}`, 10, 60);

      if (ticket.eventDate) {
        doc.setTextColor(200, 200, 200);
        const dateStr = new Date(ticket.eventDate).toLocaleDateString();
        doc.text(`${t('tickets.eventDate')}: ${dateStr}`, 10, 70);
      }

      doc.setTextColor(255, 255, 255);
      doc.text(`${t('profile.fullName')}: ${ticket.userFullName}`, 10, 80);

      // Extract QR code canvas
      const qrElement = document.getElementById('qr-canvas-hidden');
      if (qrElement) {
        const qrDataUrl = qrElement.toDataURL('image/png');
        doc.addImage(qrDataUrl, 'PNG', 15, 95, 70, 70);
      }

      // Ticket Code
      doc.setFontSize(12);
      doc.text(ticket.ticketCode, 50, 172, { align: 'center' });

      doc.save(`Ticket-${code}.pdf`);
    } catch (e) {
      console.error('Download PDF error:', e);
      addToast(t('common.error'), 'error');
    }
  };

  const sendEmail = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      await axiosInstance.post(`/tickets/${code}/send-email`);
      addToast(t('tickets.sendEmailSuccess'), 'success');
    } catch (e) {
      console.error('Send email error:', e);
      addToast(e.response?.data?.error || t('tickets.sendEmailFail'), 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <><Navbar /><div className="loading-state">⏳ {t('tickets.loading')}</div></>;
  if (error || !ticket) return (
    <><Navbar />
      <div className="page-container">
        <div className="empty-state">❌ {error}</div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/my-registrations" className="btn-register" style={{ display: 'inline-block', textDecoration: 'none' }}>
            ← {t('common.back')}
          </Link>
        </div>
      </div>
    </>
  );

  const statusColors = { ACTIVE: '#86efac', USED: '#fde047', CANCELLED: '#fca5a5' };
  const statusLabel = t(`tickets.status.${ticket.status}`) || ticket.status;

  return (
    <>
      <Navbar />
      <div className="page-container" style={{ maxWidth: 500, margin: '0 auto', padding: '2rem' }}>
        <div id="ticket-card" className="ticket-qr-card">
          {/* Header */}
          <div className="ticket-qr-header">
            <div className="ticket-qr-logo">🎪 EventHub</div>
            <div className="ticket-qr-status" style={{ color: statusColors[ticket.status] }}>
              {statusLabel}
            </div>
          </div>

          {/* Event Info */}
          <div className="ticket-qr-event">
            <h2>{ticket.eventTitle}</h2>
            <div className="ticket-qr-meta">
              <span>🪑 {t('tickets.area')}: <strong style={{ color: '#a78bfa' }}>{ticket.zoneName}</strong></span>
              {ticket.eventDate && (
                <span>📅 {new Date(ticket.eventDate).toLocaleDateString()}</span>
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
            {/* Hidden Canvas for PDF Generation */}
            <div style={{ display: 'none' }}>
              <QRCodeCanvas
                id="qr-canvas-hidden"
                value={`EVENTHUB:${ticket.ticketCode}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
                level="H"
                includeMargin
              />
            </div>
          </div>

          {/* Ticket Code */}
          <div className="ticket-qr-ticket-code">
            {ticket.ticketCode}
          </div>

          {/* Used timestamp */}
          {ticket.usedAt && (
            <div style={{ textAlign: 'center', color: '#fde047', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {t('tickets.checkInAt')}: {new Date(ticket.usedAt).toLocaleString()}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={downloadPDF} className="btn-register" style={{ flex: 1, background: '#a78bfa', color: '#1a1a2e', border:'none' }}>
              📄 {t('tickets.download')}
            </button>
            <button onClick={downloadPNG} className="btn-register" style={{ flex: 1 }}>
              📥 {t('tickets.downloadPng')}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={sendEmail} className="btn-register" style={{ flex: 1, background: '#86efac', color: '#1a1a2e', border:'none' }} disabled={sendingEmail}>
              {sendingEmail ? '⏳...' : `📧 ${t('tickets.sendEmail')}`}
            </button>
            <Link to="/my-registrations" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
              ← {t('common.back')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
