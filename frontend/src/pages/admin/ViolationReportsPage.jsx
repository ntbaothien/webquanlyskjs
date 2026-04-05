import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

const REASON_LABELS = {
  SPAM:          '🚫 Spam',
  MISLEADING:    '⚠️ Sai lệch',
  INAPPROPRIATE: '🔞 Không phù hợp',
  FRAUD:         '💸 Lừa đảo',
  DUPLICATE:     '📋 Trùng lặp',
  OTHER:         '❓ Khác',
};

const STATUS_CONFIG = {
  PENDING:   { label: 'Chờ xử lý',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  REVIEWED:  { label: 'Đã xem xét',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  DISMISSED: { label: 'Đã bỏ qua',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '6px', color: c.color, background: c.bg, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

export default function ViolationReportsPage() {
  const [data, setData]         = useState({ content: [], totalPages: 0, totalElements: 0, pendingCount: 0 });
  const [filters, setFilters]   = useState({ keyword: '', status: '', page: 0 });
  const [loading, setLoading]   = useState(true);
  const [detail, setDetail]     = useState(null);   // selected report for review modal
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState({ text: '', type: '' });
  const debounceRef             = useRef(null);

  const fetchReports = async (f = filters) => {
    setLoading(true);
    try {
      const params = {};
      if (f.keyword) params.keyword = f.keyword;
      if (f.status)  params.status  = f.status;
      params.page = f.page;
      const { data: res } = await axiosInstance.get('/admin/violations', { params });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const handleKeyword = (val) => {
    const nf = { ...filters, keyword: val, page: 0 };
    setFilters(nf);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchReports(nf), 400);
  };

  const handleStatus = (val) => {
    const nf = { ...filters, status: val, page: 0 };
    setFilters(nf);
    fetchReports(nf);
  };

  const handlePage = (p) => {
    const nf = { ...filters, page: p };
    setFilters(nf);
    fetchReports(nf);
  };

  const openDetail = (report) => {
    setDetail(report);
    setAdminNote(report.adminNote || '');
  };

  const handleUpdate = async (newStatus) => {
    if (!detail) return;
    setSaving(true);
    try {
      await axiosInstance.put(`/admin/violations/${detail._id}`, { status: newStatus, adminNote });
      showMsg('Cập nhật thành công');
      setDetail(null);
      fetchReports();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Thao tác thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusTabs = [
    { value: '',          label: 'Tất cả',     count: data.totalElements },
    { value: 'PENDING',   label: 'Chờ xử lý',  count: data.pendingCount },
    { value: 'REVIEWED',  label: 'Đã xem xét', count: null },
    { value: 'DISMISSED', label: 'Đã bỏ qua',  count: null },
  ];

  return (
    <AdminLayout
      title="🚨 Báo cáo vi phạm"
      subtitle={`${data.totalElements} báo cáo · ${data.pendingCount} chờ xử lý`}
    >
      {msg.text && (
        <div className={`admin-msg ${msg.type}`}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* ── Status tabs ── */}
      <div className="vr-tabs">
        {statusTabs.map(t => (
          <button key={t.value}
            className={`vr-tab ${filters.status === t.value ? 'active' : ''}`}
            onClick={() => handleStatus(t.value)}>
            {t.label}
            {t.count != null && (
              <span className={`vr-tab-badge ${t.value === 'PENDING' && t.count > 0 ? 'urgent' : ''}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div className="vr-search-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="admin-search-input"
            style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }}
            placeholder="Tìm theo tên sự kiện, người báo cáo..."
            value={filters.keyword}
            onChange={e => handleKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="admin-loading">⏳ Đang tải...</div>
      ) : data.content.length === 0 ? (
        <div className="admin-empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
          <div>Không có báo cáo nào{filters.status ? ` (${STATUS_CONFIG[filters.status]?.label})` : ''}</div>
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sự kiện</th>
                <th>Người báo cáo</th>
                <th>Lý do</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((r, idx) => (
                <tr key={r._id}>
                  <td className="admin-cell-muted">{filters.page * 20 + idx + 1}</td>
                  <td>
                    <Link to={`/events/${r.eventId}`} target="_blank"
                      style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
                      {r.eventTitle}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#fff' }}>{r.reporterName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{r.reporterEmail}</div>
                  </td>
                  <td>
                    <span className="vr-reason-badge">{REASON_LABELS[r.reason] || r.reason}</span>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.description || <em style={{ opacity: 0.4 }}>Không có</em>}
                    </span>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-info" onClick={() => openDetail(r)} title="Xem & xử lý">
                      👁️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {data.totalPages > 1 && (
        <div className="admin-pagination">
          <button className="admin-page-btn" disabled={filters.page === 0}
            onClick={() => handlePage(filters.page - 1)}>‹</button>
          {Array.from({ length: Math.min(data.totalPages, 7) }).map((_, i) => {
            const start = Math.max(0, Math.min(filters.page - 3, data.totalPages - 7));
            const p = start + i;
            if (p >= data.totalPages) return null;
            return (
              <button key={p} className={`admin-page-btn ${p === filters.page ? 'active' : ''}`}
                onClick={() => handlePage(p)}>{p + 1}</button>
            );
          })}
          <button className="admin-page-btn" disabled={filters.page >= data.totalPages - 1}
            onClick={() => handlePage(filters.page + 1)}>›</button>
        </div>
      )}

      {/* ── Detail / Review modal ── */}
      {detail && (
        <div className="admin-modal-overlay" onClick={() => setDetail(null)}>
          <div className="admin-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>🚨 Xem xét báo cáo</h2>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                  Báo cáo #{String(detail._id).slice(-6).toUpperCase()}
                </p>
              </div>
              <button className="admin-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>

            {/* Event info */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">Sự kiện bị báo cáo</div>
              <Link to={`/events/${detail.eventId}`} target="_blank"
                style={{ color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>
                {detail.eventTitle} ↗
              </Link>
            </div>

            {/* Reporter */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">Người báo cáo</div>
              <div style={{ color: '#fff', fontWeight: 600 }}>{detail.reporterName}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>{detail.reporterEmail}</div>
            </div>

            {/* Reason + description */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">Lý do</div>
              <span className="vr-reason-badge">{REASON_LABELS[detail.reason] || detail.reason}</span>
            </div>

            {detail.description && (
              <div className="vr-detail-section">
                <div className="vr-detail-label">Mô tả chi tiết</div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {detail.description}
                </p>
              </div>
            )}

            <div className="vr-detail-section">
              <div className="vr-detail-label">Thời gian báo cáo</div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                {new Date(detail.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>

            {/* Admin note */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">Ghi chú xử lý (admin)</div>
              <textarea
                className="vr-admin-note"
                placeholder="Nhập ghi chú về cách xử lý báo cáo này..."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="vr-modal-actions">
              {detail.status !== 'REVIEWED' && (
                <button className="vr-action-btn reviewed" disabled={saving}
                  onClick={() => handleUpdate('REVIEWED')}>
                  {saving ? '⏳' : '✅'} Đã xem xét
                </button>
              )}
              {detail.status !== 'DISMISSED' && (
                <button className="vr-action-btn dismissed" disabled={saving}
                  onClick={() => handleUpdate('DISMISSED')}>
                  {saving ? '⏳' : '🗑️'} Bỏ qua
                </button>
              )}
              {detail.status !== 'PENDING' && (
                <button className="vr-action-btn pending" disabled={saving}
                  onClick={() => handleUpdate('PENDING')}>
                  🔄 Đánh dấu chờ xử lý
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
