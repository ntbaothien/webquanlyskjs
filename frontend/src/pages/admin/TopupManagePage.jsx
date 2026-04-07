import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

const STATUS_COLORS = {
  PENDING:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  COMPLETED: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  REJECTED:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

function StatusBadge({ status, label }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '6px', color: c.color, background: c.bg, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export default function TopupManagePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [data, setData]           = useState({ content: [], totalPages: 0, totalElements: 0, pendingCount: 0 });
  const [filters, setFilters]     = useState({ keyword: '', status: 'PENDING', page: 0 });
  const [loading, setLoading]     = useState(true);
  const [actionModal, setActionModal] = useState(null);  // { tx, action: 'approve'|'reject' }
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState({ text: '', type: '' });
  const debounceRef               = useRef(null);

  const fetchTopups = async (f = filters) => {
    setLoading(true);
    try {
      const params = { page: f.page };
      if (f.keyword) params.keyword = f.keyword;
      if (f.status)  params.status  = f.status;
      const { data: res } = await axiosInstance.get('/admin/topups', { params });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTopups(); }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const handleKeyword = (val) => {
    const nf = { ...filters, keyword: val, page: 0 };
    setFilters(nf);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTopups(nf), 400);
  };

  const handleStatusFilter = (val) => {
    const nf = { ...filters, status: val, page: 0 };
    setFilters(nf);
    fetchTopups(nf);
  };

  const handleProcess = async () => {
    if (!actionModal) return;
    setSaving(true);
    try {
      await axiosInstance.put(`/admin/topups/${actionModal.tx._id}`, {
        action: actionModal.action,
        adminNote
      });
      showMsg(actionModal.action === 'approve' ? `✅ ${t('admin.approveSuccess')}` : `❌ ${t('admin.rejectSuccess')}`);
      setActionModal(null);
      setAdminNote('');
      fetchTopups();
    } catch (err) {
      showMsg(err.response?.data?.error || t('admin.actionFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusTabs = [
    { value: 'PENDING',   label: t('admin.pendingApproval'), showCount: true },
    { value: '',          label: t('admin.allTopups'),        showCount: false },
    { value: 'COMPLETED', label: t('admin.approved'),         showCount: false },
    { value: 'REJECTED',  label: t('admin.rejected'),         showCount: false },
  ];

  const getStatusLabel = (status) => {
    if (status === 'PENDING')   return t('admin.pendingApproval');
    if (status === 'COMPLETED') return t('admin.approved');
    if (status === 'REJECTED')  return t('admin.rejected');
    return status;
  };

  return (
    <AdminLayout
      title={`💳 ${t('admin.topupManage')}`}
      subtitle={t('admin.topupSub', { pending: data.pendingCount, total: data.totalElements })}
    >
      {msg.text && (
        <div className={`admin-msg ${msg.type}`}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="vr-tabs">
        {statusTabs.map(tab => (
          <button key={tab.value}
            className={`vr-tab ${filters.status === tab.value ? 'active' : ''}`}
            onClick={() => handleStatusFilter(tab.value)}>
            {tab.label}
            {tab.showCount && data.pendingCount > 0 && (
              <span className="vr-tab-badge urgent">{data.pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="vr-search-bar">
        <div style={{ position: 'relative', flex: 1 }}>
          <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="admin-search-input"
            style={{ paddingLeft: '2.2rem', width: '100%', boxSizing: 'border-box' }}
            placeholder={t('admin.searchTopup')}
            value={filters.keyword}
            onChange={e => handleKeyword(e.target.value)} />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="admin-loading">⏳ {t('common.loading')}</div>
      ) : data.content.length === 0 ? (
        <div className="admin-empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💸</div>
          <div>{t('admin.noTopups')}{filters.status ? ` (${getStatusLabel(filters.status)})` : ''}</div>
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('admin.user')}</th>
                <th>{t('admin.transCode')}</th>
                <th>{t('admin.amount')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.time')}</th>
                <th>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((tx, idx) => (
                <tr key={tx._id}>
                  <td className="admin-cell-muted">{filters.page * 20 + idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text)', fontSize: '0.88rem' }}>{tx.userName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{tx.userEmail}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', padding: '0.15rem 0.5rem', borderRadius: '5px', fontSize: '0.82rem', fontWeight: 700 }}>
                      {tx.transferCode}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1rem' }}>
                      {tx.amount.toLocaleString(locale)}đ
                    </span>
                  </td>
                  <td><StatusBadge status={tx.status} label={getStatusLabel(tx.status)} /></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(tx.createdAt).toLocaleString(locale)}
                  </td>
                  <td>
                    {tx.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="admin-btn admin-btn-success"
                          onClick={() => { setActionModal({ tx, action: 'approve' }); setAdminNote(''); }}
                          title={t('admin.approve')}>
                          ✅
                        </button>
                        <button className="admin-btn admin-btn-danger"
                          onClick={() => { setActionModal({ tx, action: 'reject' }); setAdminNote(''); }}
                          title={t('admin.reject')}>
                          ❌
                        </button>
                      </div>
                    ) : (
                      <button className="admin-btn admin-btn-info"
                        onClick={() => { setActionModal({ tx, action: null }); setAdminNote(tx.adminNote || ''); }}
                        title={t('admin.viewDetail')}>
                        👁️
                      </button>
                    )}
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
            onClick={() => { const nf = { ...filters, page: filters.page - 1 }; setFilters(nf); fetchTopups(nf); }}>‹</button>
          {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
            const start = Math.max(0, Math.min(filters.page - 3, data.totalPages - 7));
            const p = start + i;
            if (p >= data.totalPages) return null;
            return (
              <button key={p} className={`admin-page-btn ${p === filters.page ? 'active' : ''}`}
                onClick={() => { const nf = { ...filters, page: p }; setFilters(nf); fetchTopups(nf); }}>
                {p + 1}
              </button>
            );
          })}
          <button className="admin-page-btn" disabled={filters.page >= data.totalPages - 1}
            onClick={() => { const nf = { ...filters, page: filters.page + 1 }; setFilters(nf); fetchTopups(nf); }}>›</button>
        </div>
      )}

      {/* ── Action modal ── */}
      {actionModal && (
        <div className="admin-modal-overlay" onClick={() => setActionModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                {actionModal.action === 'approve' ? `✅ ${t('admin.approveTopup')}`
                  : actionModal.action === 'reject' ? `❌ ${t('admin.rejectRequest')}`
                  : `👁️ ${t('admin.topupDetail')}`}
              </h2>
              <button className="admin-modal-close" onClick={() => setActionModal(null)}>✕</button>
            </div>

            {/* Transaction info */}
            <div style={{ background: 'var(--admin-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                [t('admin.user'),      actionModal.tx.userName,  false],
                [t('admin.email'),     actionModal.tx.userEmail, false],
                [t('admin.transCode'), actionModal.tx.transferCode, false],
                [t('admin.amount'),    `${actionModal.tx.amount.toLocaleString(locale)}đ`, true],
                [t('admin.time'),      new Date(actionModal.tx.createdAt).toLocaleString(locale), false],
              ].map(([k, v, isAmount]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--admin-text-muted)' }}>{k}</span>
                  <strong style={{ color: isAmount ? '#fbbf24' : 'var(--admin-text)' }}>{v}</strong>
                </div>
              ))}
            </div>

            {actionModal.action && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('admin.note')}{actionModal.action === 'reject' ? ` ${t('admin.noteRejection')}` : ` ${t('admin.noteOptional')}`}
                </label>
                <textarea
                  className="vr-admin-note"
                  rows={3}
                  placeholder={actionModal.action === 'reject' ? t('admin.rejectPlaceholder') : t('admin.notePlaceholder')}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                />
              </div>
            )}

            {actionModal.action === null && actionModal.tx.adminNote && (
              <div style={{ background: 'var(--admin-surface)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>{t('admin.adminNote')}</div>
                {actionModal.tx.adminNote}
              </div>
            )}

            {actionModal.action && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="wallet-btn-secondary" style={{ flex: 1 }} onClick={() => setActionModal(null)}>
                  {t('admin.cancel')}
                </button>
                <button
                  disabled={saving || (actionModal.action === 'reject' && !adminNote.trim())}
                  onClick={handleProcess}
                  style={{
                    flex: 2, padding: '0.7rem 1rem', border: 'none', borderRadius: '10px',
                    color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', transition: 'opacity 0.2s',
                    background: actionModal.action === 'approve'
                      ? 'linear-gradient(135deg, #16a34a, #15803d)'
                      : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    opacity: saving ? 0.6 : 1,
                  }}>
                  {saving ? `⏳ ${t('admin.processing')}`
                    : actionModal.action === 'approve' ? `✅ ${t('admin.confirmApprove')}`
                    : `❌ ${t('admin.confirmReject')}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
