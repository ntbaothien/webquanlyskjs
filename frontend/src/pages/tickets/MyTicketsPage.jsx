import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../../utils/axiosInstance';

const statusBadge = (s) => ({
  Active: <span className="badge badge-green">Active</span>,
  Used: <span className="badge badge-orange">Đã dùng</span>,
  Transferred: <span className="badge badge-blue">Đã chuyển</span>,
  Cancelled: <span className="badge badge-red">Đã hủy</span>,
}[s] || <span className="badge badge-purple">{s}</span>);

const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // modal vé
  const [transferModal, setTransferModal] = useState(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    axiosInstance.get('/tickets/me').then(({ data }) => {
      setTickets(data.data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/tickets/${transferModal._id}/transfer`, { toEmail: transferEmail });
      setMsg({ type: 'success', text: 'Chuyển vé thành công!' });
      setTransferModal(null);
      const { data } = await axiosInstance.get('/tickets/me');
      setTickets(data.data.items || []);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Thất bại' });
    }
  };

  if (loading) return <div className="loading-center" style={{ marginTop: 100 }}><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container page-content">
        <div className="flex-between mb-32">
          <div>
            <h2>🎫 Vé của tôi</h2>
            <p className="mt-8">{tickets.length} vé</p>
          </div>
        </div>

        {msg && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'} mb-16`}>{msg.text}</div>}

        {tickets.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎟️</div>
            <h3>Bạn chưa có vé nào</h3>
            <p className="mt-8">Hãy mua vé cho sự kiện đầu tiên của bạn!</p>
          </div>
        ) : (
          <div className="grid grid-events">
            {tickets.map(ticket => (
              <div key={ticket._id} className="card" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => setSelected(ticket)}>
                {/* Decorative line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,var(--primary),var(--secondary))' }} />
                <div className="flex-between mb-12">
                  {statusBadge(ticket.status)}
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(ticket.issuedAt)}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{ticket.eventId?.title || 'Sự kiện'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>📅 {formatDate(ticket.eventId?.startTime)}</div>
                {ticket.eventId?.location && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📍 {ticket.eventId.location}</div>}
                <div className="flex-between mt-16">
                  <span className="badge badge-purple">{ticket.ticketTypeId?.name}</span>
                  {ticket.status === 'Active' && (
                    <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); setTransferModal(ticket); }}>
                      ↗ Chuyển vé
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🎫 Chi tiết vé</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="text-center" style={{ padding: '16px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{selected.eventId?.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>{selected.ticketTypeId?.name}</div>
              {selected.status === 'Active' ? (
                <div style={{ background: 'white', padding: 20, borderRadius: 12, display: 'inline-block' }}>
                  <QRCodeSVG value={selected.qrCode} size={200} />
                </div>
              ) : (
                <div style={{ padding: 40, background: 'var(--bg-card2)', borderRadius: 12 }}>
                  <div style={{ fontSize: '3rem', marginBottom: 8 }}>🚫</div>
                  <p>Vé không thể sử dụng</p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Trạng thái: {selected.status}</p>
                </div>
              )}
              <div className="mt-16">{statusBadge(selected.status)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 12 }}>
                Mã vé: {selected._id}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="modal-overlay" onClick={() => setTransferModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">↗ Chuyển nhượng vé</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setTransferModal(null)}>✕</button>
            </div>
            <p className="mb-16" style={{ fontSize: 14 }}>Nhập email người bạn muốn chuyển vé "{transferModal.ticketTypeId?.name}" đến:</p>
            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="form-input" type="email" placeholder="email@example.com"
                value={transferEmail} onChange={e => setTransferEmail(e.target.value)} required />
              <div className="alert alert-warning" style={{ fontSize: 13 }}>⚠️ Hành động này không thể hoàn tác sau khi xác nhận</div>
              <button className="btn btn-primary w-full" type="submit">Xác nhận chuyển</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
