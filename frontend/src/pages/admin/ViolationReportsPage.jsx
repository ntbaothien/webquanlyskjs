import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

const STATUS_COLORS = {
  PENDING:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  REVIEWED:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  DISMISSED: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

function StatusBadge({ status, label }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '6px', color: c.color, background: c.bg, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export default function ViolationReportsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
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
      showMsg(t('admin.updateSuccess'));
      setDetail(null);
      fetchReports();
    } catch (err) {
      showMsg(err.response?.data?.error || t('admin.actionFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const REASON_LABELS = {
    SPAM:          `🚫 Spam`,
    MISLEADING:    `⚠️ ${i18n.language === 'vi' ? 'Sai lệch' : 'Misleading'}`,
    INAPPROPRIATE: `🔞 ${i18n.language === 'vi' ? 'Không phù hợp' : 'Inappropriate'}`,
    FRAUD:         `💸 ${i18n.language === 'vi' ? 'Lừa đảo' : 'Fraud'}`,
    DUPLICATE:     `📋 ${i18n.language === 'vi' ? 'Trùng lặp' : 'Duplicate'}`,
    OTHER:         `❓ ${i18n.language === 'vi' ? 'Khác' : 'Other'}`,
  };

  const getStatusLabel = (s) => {
    if (s === 'PENDING')   return t('admin.pendingReports');
    if (s === 'REVIEWED')  return t('admin.reviewedReports');
    if (s === 'DISMISSED') return t('admin.dismissedReports');
    return s;
  };

  const statusTabs = [
    { value: '',          label: t('admin.allReports'),      count: data.totalElements },
    { value: 'PENDING',   label: t('admin.pendingReports'),  count: data.pendingCount },
    { value: 'REVIEWED',  label: t('admin.reviewedReports'), count: null },
    { value: 'DISMISSED', label: t('admin.dismissedReports'),count: null },
  ];

  return (
    <AdminLayout
      title={`🚨 ${t('admin.violationReports')}`}
      subtitle={t('admin.violationSub')}
    >
      {msg.text && (
        <div className={`admin-msg ${msg.type}`}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* ── Status tabs ── */}
      <div className="vr-tabs">
        {statusTabs.map(tab => (
          <button key={tab.value}
            className={`vr-tab ${filters.status === tab.value ? 'active' : ''}`}
            onClick={() => handleStatus(tab.value)}>
            {tab.label}
            {tab.count != null && (
              <span className={`vr-tab-badge ${tab.value === 'PENDING' && tab.count > 0 ? 'urgent' : ''}`}>
                {tab.count}
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
            placeholder={t('admin.searchReport')}
            value={filters.keyword}
            onChange={e => handleKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="admin-loading">⏳ {t('common.loading')}</div>
      ) : data.content.length === 0 ? (
        <div className="admin-empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
          <div>{t('admin.noReports')}{filters.status ? ` (${getStatusLabel(filters.status)})` : ''}</div>
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('admin.reportedEvent')}</th>
                <th>{t('admin.reporter')}</th>
                <th>{t('admin.reason')}</th>
                <th>{t('admin.description')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.reportTime')}</th>
                <th>{t('admin.actions')}</th>
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
                    <div style={{ fontSize: '0.85rem', color: 'var(--admin-text)' }}>{r.reporterName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{r.reporterEmail}</div>
                  </td>
                  <td>
                    <span className="vr-reason-badge">{REASON_LABELS[r.reason] || r.reason}</span>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.description || <em style={{ opacity: 0.4 }}>{i18n.language === 'vi' ? 'Không có' : 'None'}</em>}
                    </span>
                  </td>
                  <td><StatusBadge status={r.status} label={getStatusLabel(r.status)} /></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleString(locale)}
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-info" onClick={() => openDetail(r)} title={t('admin.viewAndProcess')}>
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
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>🚨 {t('admin.reviewReport')}</h2>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                  {i18n.language === 'vi' ? 'Báo cáo' : 'Report'} #{String(detail._id).slice(-6).toUpperCase()}
                </p>
              </div>
              <button className="admin-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>

            {/* Event info */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">{t('admin.reportedEventLabel')}</div>
              <Link to={`/events/${detail.eventId}`} target="_blank"
                style={{ color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>
                {detail.eventTitle} ↗
              </Link>
            </div>

            {/* Reporter */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">{t('admin.reporterLabel')}</div>
              <div style={{ color: 'var(--admin-text)', fontWeight: 600 }}>{detail.reporterName}</div>
              <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem' }}>{detail.reporterEmail}</div>
            </div>

            {/* Reason + description */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">{t('admin.reasonLabel')}</div>
              <span className="vr-reason-badge">{REASON_LABELS[detail.reason] || detail.reason}</span>
            </div>

            {detail.description && (
              <div className="vr-detail-section">
                <div className="vr-detail-label">{t('admin.descLabel')}</div>
                <p style={{ margin: 0, color: 'var(--admin-text)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {detail.description}
                </p>
              </div>
            )}

            <div className="vr-detail-section">
              <div className="vr-detail-label">{t('admin.reportTimeLabel')}</div>
              <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                {new Date(detail.createdAt).toLocaleString(locale)}
              </span>
            </div>

            {/* Admin note */}
            <div className="vr-detail-section">
              <div className="vr-detail-label">{t('admin.adminNoteLabel')}</div>
              <textarea
                className="vr-admin-note"
                placeholder={t('admin.notePlaceholderVR')}
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
                  {saving ? '⏳' : '✅'} {t('admin.markReviewed')}
                </button>
              )}
              {detail.status !== 'DISMISSED' && (
                <button className="vr-action-btn dismissed" disabled={saving}
                  onClick={() => handleUpdate('DISMISSED')}>
                  {saving ? '⏳' : '🗑️'} {t('admin.dismiss')}
                </button>
              )}
              {detail.status !== 'PENDING' && (
                <button className="vr-action-btn pending" disabled={saving}
                  onClick={() => handleUpdate('PENDING')}>
                  🔄 {t('admin.markPending')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
