import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import AdminLayout from '../../components/admin/AdminLayout';
import SeatHeatmap from '../../components/events/SeatHeatmap';
import './Admin.css';

export default function AdminEventManagePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [filters, setFilters] = useState({ keyword: '', status: '', page: 0 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [regModal, setRegModal] = useState(null); // { eventId, eventTitle }
  const [regData, setRegData] = useState({ registrations: [], bookings: [] });
  const [regLoading, setRegLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // { eventId, title }
  const [rejectReason, setRejectReason] = useState('');
  const [heatmapEventId, setHeatmapEventId] = useState(null);
  const [heatmapEventTitle, setHeatmapEventTitle] = useState('');

  const fetchEvents = async (f = filters) => {
    setLoading(true);
    try {
      const params = { ...f };
      Object.keys(params).forEach(k => !params[k] && params[k] !== 0 && delete params[k]);
      const { data: res } = await axiosInstance.get('/admin/events', { params });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(t('admin.deleteConfirm', { title }))) return;
    try {
      await axiosInstance.delete(`/admin/events/${id}`);
      showMsg(t('admin.deleteSuccess'));
      fetchEvents();
    } catch (err) {
      showMsg(err.response?.data?.error || t('admin.actionFailed'), 'error');
    }
  };

  const handleApprove = async (id, title) => {
    if (!window.confirm(`Duyệt sự kiện "${title}" và đăng lên công khai?`)) return;
    try {
      await axiosInstance.post(`/admin/events/${id}/approve`);
      showMsg(`✅ Đã duyệt sự kiện "${title}"`);
      fetchEvents();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Lỗi duyệt sự kiện', 'error');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { showMsg('Vui lòng nhập lý do từ chối', 'error'); return; }
    try {
      await axiosInstance.post(`/admin/events/${rejectModal.eventId}/reject`, { reason: rejectReason });
      showMsg(`❌ Đã từ chối sự kiện "${rejectModal.title}"`);
      setRejectModal(null);
      setRejectReason('');
      fetchEvents();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Lỗi từ chối sự kiện', 'error');
    }
  };

  const handleViewRegistrations = async (eventId, eventTitle) => {
    setRegModal({ eventId, eventTitle });
    setRegLoading(true);
    try {
      const { data: res } = await axiosInstance.get(`/admin/events/${eventId}/registrations`);
      setRegData(res);
    } catch (err) { console.error(err); }
    finally { setRegLoading(false); }
  };

  const search = (e) => {
    e.preventDefault();
    const nf = { ...filters, page: 0 };
    setFilters(nf);
    fetchEvents(nf);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }) : '—';

  return (
    <AdminLayout title={`🎪 ${t('admin.eventManage')}`} subtitle={t('admin.eventManageSub', { count: data.totalElements || 0 })}>
      {/* Message */}
      {msg.text && <div className={`admin-msg ${msg.type}`}>{msg.type === 'success' ? '✅' : '❌'} {msg.text}</div>}

      {/* Filter Bar */}
      <form className="admin-filter-bar" onSubmit={search}>
        <input
          className="admin-search-input"
          placeholder={`🔍 ${t('admin.searchEvent')}`}
          value={filters.keyword}
          onChange={e => setFilters({ ...filters, keyword: e.target.value })}
        />
        <select
          className="admin-filter-select"
          value={filters.status}
          onChange={e => { const nf = { ...filters, status: e.target.value, page: 0 }; setFilters(nf); fetchEvents(nf); }}
        >
          <option value="">{t('admin.allStatus')}</option>
          <option value="PENDING_APPROVAL">⏳ Chờ duyệt</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="DRAFT">DRAFT</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button className="admin-filter-btn" type="submit">{t('admin.search')}</button>
      </form>

      {/* Events Table */}
      {loading ? (
        <div className="admin-loading">⏳ {t('common.loading')}</div>
      ) : data.content.length === 0 ? (
        <div className="admin-empty-state">😔 {t('admin.noEvents')}</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.eventName')}</th>
                <th>{t('admin.organizer')}</th>
                <th>{t('admin.startDate')}</th>
                <th>{t('admin.location')}</th>
                <th>{t('admin.attendees')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map(e => (
                <tr key={e.id}>
                  <td>
                    <strong style={{ color: 'var(--admin-text)' }}>{e.title}</strong>
                    {!e.isFree && e.free === false && (
                      <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#fde047', background: 'rgba(234,179,8,0.15)', padding: '0.15rem 0.4rem', borderRadius: 10, border: '1px solid rgba(234,179,8,0.3)' }}>
                        💰 {t('admin.paid')}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)' }}>{e.organizerName || '—'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{formatDate(e.startDate)}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>{e.location || '—'}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{e.currentAttendees}</span>
                    <span style={{ color: 'var(--admin-text-dim)' }}> / {e.maxCapacity || '∞'}</span>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${e.status?.toLowerCase()}`}>{e.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {/* Duyệt / Từ chối cho sự kiện đang chờ */}
                      {e.status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            className="admin-btn"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => handleApprove(e.id, e.title)}
                            title="Duyệt xuất bản"
                          >
                            ✅ Duyệt
                          </button>
                          <button
                            className="admin-btn"
                            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => { setRejectModal({ eventId: e.id, title: e.title }); setRejectReason(''); }}
                            title="Từ chối"
                          >
                            ❌ Từ chối
                          </button>
                        </>
                      )}
                      <button className="admin-btn admin-btn-info" onClick={() => handleViewRegistrations(e.id, e.title)}>
                        👥
                      </button>
                      
                      {/* Heatmap button */}
                      {(e.seatZones?.length > 0 || e.eventType === 'PAID' || !e.free) && (
                        <button className="admin-btn" onClick={() => {
                          setHeatmapEventId(e.id);
                          setHeatmapEventTitle(e.title);
                        }} style={{
                          background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.3)'
                        }} title="Heatmap phân bổ ghế">
                          🔥 Heat
                        </button>
                      )}

                      {e.status !== 'CANCELLED' && (
                        <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(e.id, e.title)}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="admin-pagination">
          <button
            className="admin-page-btn"
            disabled={filters.page === 0}
            onClick={() => { const nf = { ...filters, page: 0 }; setFilters(nf); fetchEvents(nf); }}
          >«</button>
          <button
            className="admin-page-btn"
            disabled={filters.page === 0}
            onClick={() => { const nf = { ...filters, page: filters.page - 1 }; setFilters(nf); fetchEvents(nf); }}
          >‹</button>
          {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
            const start = Math.max(0, Math.min(filters.page - 3, data.totalPages - 7));
            const pageNum = start + i;
            if (pageNum >= data.totalPages) return null;
            return (
              <button
                key={pageNum}
                className={`admin-page-btn ${pageNum === filters.page ? 'active' : ''}`}
                onClick={() => { const nf = { ...filters, page: pageNum }; setFilters(nf); fetchEvents(nf); }}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            className="admin-page-btn"
            disabled={filters.page >= data.totalPages - 1}
            onClick={() => { const nf = { ...filters, page: filters.page + 1 }; setFilters(nf); fetchEvents(nf); }}
          >›</button>
          <button
            className="admin-page-btn"
            disabled={filters.page >= data.totalPages - 1}
            onClick={() => { const nf = { ...filters, page: data.totalPages - 1 }; setFilters(nf); fetchEvents(nf); }}
          >»</button>
        </div>
      )}

      {/* Registrations Modal */}
      {regModal && (
        <div className="admin-modal-overlay" onClick={() => setRegModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>👥 {t('admin.registrantList')}</h2>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{regModal.eventTitle}</p>
              </div>
              <button className="admin-modal-close" onClick={() => setRegModal(null)}>✕</button>
            </div>

            {regLoading ? (
              <div className="admin-loading">⏳ {t('common.loading')}</div>
            ) : (
              <>
                {/* Free registrations */}
                {regData.registrations?.length > 0 && (
                  <>
                    <h3 style={{ color: 'var(--admin-text)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>🎟️ {t('admin.freeReg')} ({regData.registrations.length})</h3>
                    <table className="admin-table" style={{ marginBottom: '1.5rem' }}>
                      <thead>
                        <tr><th>{t('admin.fullName')}</th><th>{t('admin.email')}</th><th>{t('admin.status')}</th><th>{t('admin.regDate')}</th></tr>
                      </thead>
                      <tbody>
                        {regData.registrations.map(r => (
                          <tr key={r.id}>
                            <td><strong style={{ color: 'var(--admin-text)' }}>{r.userFullName}</strong></td>
                            <td>{r.userEmail}</td>
                            <td>
                              <span className={`admin-status-badge ${r.status === 'CONFIRMED' ? 'published' : 'cancelled'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>{formatDate(r.registeredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {/* Paid bookings */}
                {regData.bookings?.length > 0 && (
                  <>
                    <h3 style={{ color: 'var(--admin-text)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>💰 {t('admin.paidBookings')} ({regData.bookings.length})</h3>
                    <table className="admin-table">
                      <thead>
                        <tr><th>{t('admin.fullName')}</th><th>{t('admin.zone')}</th><th>{t('admin.qty')}</th><th>{t('admin.totalAmount')}</th><th>{t('admin.status')}</th></tr>
                      </thead>
                      <tbody>
                        {regData.bookings.map(b => (
                          <tr key={b.id}>
                            <td><strong style={{ color: 'var(--admin-text)' }}>{b.userFullName}</strong></td>
                            <td>{b.zoneName}</td>
                            <td>{b.quantity}</td>
                            <td style={{ color: '#a78bfa', fontWeight: 600 }}>
                              {b.finalAmount?.toLocaleString(locale)}đ
                            </td>
                            <td>
                              <span className={`admin-status-badge ${b.status === 'CONFIRMED' ? 'published' : 'cancelled'}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {!regData.registrations?.length && !regData.bookings?.length && (
                  <div className="admin-empty-state">😔 {t('admin.noRegistrations')}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* Reject Modal */}
      {rejectModal && (
        <div className="admin-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, color: '#ef4444' }}>❌ Từ chối sự kiện</h2>
              <button className="admin-modal-close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Sự kiện: <strong style={{ color: 'var(--admin-text)' }}>{rejectModal.title}</strong>
            </p>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text)' }}>
              Lý do từ chối <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Nhập lý do cụ thể để Organizer biết điều chỉnh..."
              rows={4}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--admin-border)',
                background: 'var(--admin-card-bg)', color: 'var(--admin-text)', resize: 'vertical',
                fontSize: '0.88rem', boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button
                className="admin-btn"
                style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}
                onClick={() => setRejectModal(null)}
              >
                Hủy
              </button>
              <button
                className="admin-btn"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff' }}
                onClick={handleRejectSubmit}
              >
                ❌ Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Modal */}
      {heatmapEventId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
          alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000,
          padding: '2rem 1rem', overflowY: 'auto'
        }} onClick={e => e.target === e.currentTarget && setHeatmapEventId(null)}>
          <div style={{ width: '100%', maxWidth: '680px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{ color: '#fff', margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>
                🔥 Heatmap — {heatmapEventTitle}
              </h2>
              <button onClick={() => setHeatmapEventId(null)} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem'
              }}>✕</button>
            </div>
            <SeatHeatmap eventId={heatmapEventId} />
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
