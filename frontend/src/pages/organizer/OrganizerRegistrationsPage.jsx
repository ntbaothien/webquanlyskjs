import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import './Organizer.css';

// ── CSV export (client-side) ──────────────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const v = r[h] ?? '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="reg-stat-card" style={{ borderTopColor: color }}>
      <div className="reg-stat-value" style={{ color }}>{value}</div>
      <div className="reg-stat-label">{label}</div>
      {sub && <div className="reg-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    CONFIRMED: { label: 'Đã xác nhận', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    CANCELLED: { label: 'Đã hủy',      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    PENDING:   { label: 'Chờ xử lý',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    REFUNDED:  { label: 'Đã hoàn tiền', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  };
  const s = map[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 600,
      padding: '0.2rem 0.55rem', borderRadius: '6px',
      color: s.color, background: s.bg
    }}>{s.label}</span>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="reg-pagination">
      <button disabled={page === 0} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
        const p = totalPages <= 7 ? i
          : page < 4 ? i
          : page > totalPages - 5 ? totalPages - 7 + i
          : page - 3 + i;
        return (
          <button key={p} className={p === page ? 'active' : ''} onClick={() => onChange(p)}>
            {p + 1}
          </button>
        );
      })}
      <button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OrganizerRegistrationsPage() {
  const { id } = useParams();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('registrations'); // registrations | bookings
  const [keyword, setKeyword]   = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(0);
  const debounceRef             = useRef(null);

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    try {
      const params = { page: opts.page ?? page, size: 20 };
      if (opts.keyword ?? keyword) params.keyword = opts.keyword ?? keyword;
      if (opts.status  ?? status)  params.status  = opts.status  ?? status;
      const { data: res } = await axiosInstance.get(`/organizer/events/${id}/registrations`, { params });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, keyword, status, page]);

  useEffect(() => { load(); }, []);

  const handleKeywordChange = (val) => {
    setKeyword(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      load({ keyword: val, page: 0 });
    }, 400);
  };

  const handleStatusChange = (val) => {
    setStatus(val);
    setPage(0);
    load({ status: val, page: 0 });
  };

  const handlePageChange = (p) => {
    setPage(p);
    load({ page: p });
  };

  const handleExport = () => {
    if (!data) return;
    if (tab === 'registrations') {
      const rows = data.registrations.map(r => ({
        'Họ tên': r.userFullName,
        'Email': r.userEmail,
        'Trạng thái': r.status,
        'Thời gian đăng ký': new Date(r.createdAt).toLocaleString('vi-VN'),
      }));
      exportCSV(rows, `dang-ky-${id}.csv`);
    } else {
      const rows = data.bookings.map(b => ({
        'Họ tên': b.userFullName,
        'Khu vực': b.zoneName,
        'Số ghế': b.quantity,
        'Giá/ghế': b.pricePerSeat,
        'Tổng tiền': b.totalPrice,
        'Trạng thái': b.status,
        'Thời gian đặt': new Date(b.createdAt).toLocaleString('vi-VN'),
      }));
      exportCSV(rows, `dat-ve-${id}.csv`);
    }
  };

  if (!data && loading) {
    return (
      <>
        <Navbar />
        <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <div className="reg-loading-spinner" />
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Đang tải dữ liệu...</p>
        </div>
      </>
    );
  }

  if (!data) return null;

  const { event, registrations, regPagination, regStats, bookings, bookPagination, bookStats } = data;
  const isFreePrimary = event.free;
  const currentList = tab === 'registrations' ? registrations : bookings;
  const currentPagination = tab === 'registrations' ? regPagination : bookPagination;

  return (
    <>
      <Navbar />
      <div className="page-container">

        {/* ── Breadcrumb ── */}
        <div className="reg-breadcrumb">
          <Link to="/organizer/my-events">📋 Sự kiện của tôi</Link>
          <span>›</span>
          <span>{event.title}</span>
          <span>›</span>
          <span>Danh sách đăng ký</span>
        </div>

        {/* ── Event header ── */}
        <div className="reg-event-header">
          <div>
            <h1 className="reg-event-title">{event.title}</h1>
            <div className="reg-event-meta">
              <span>📍 {event.location}</span>
              <span>📅 {new Date(event.startDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className={`reg-event-type ${event.free ? 'free' : 'paid'}`}>
                {event.free ? '🆓 Miễn phí' : '💳 Có phí'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to={`/events/${id}?tab=polls`} className="reg-poll-btn" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '0.6rem 1rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(167,139,250,0.3)' }}>
              📊 Bình chọn
            </Link>
            <Link to={`/organizer/events/${id}/edit`} className="reg-edit-btn">✏️ Chỉnh sửa sự kiện</Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="reg-stats-grid">
          {isFreePrimary ? (
            <>
              <StatCard label="Tổng đăng ký" value={regStats.total} color="#a78bfa" />
              <StatCard label="Đã xác nhận"  value={regStats.confirmed} color="#4ade80" />
              <StatCard label="Đã hủy"       value={regStats.cancelled} color="#f87171" />
              <StatCard label="Sức chứa"
                value={event.maxCapacity > 0 ? event.maxCapacity : '∞'} color="#94a3b8"
                sub={event.maxCapacity > 0 ? `Còn ${Math.max(0, event.maxCapacity - regStats.confirmed)} chỗ` : null} />
            </>
          ) : (
            <>
              <StatCard label="Tổng đặt vé"  value={bookStats.total} color="#a78bfa" />
              <StatCard label="Đã xác nhận"  value={bookStats.confirmed} color="#4ade80" />
              <StatCard label="Tổng ghế đã bán" value={bookStats.totalSeats} color="#60a5fa" />
              <StatCard label="Doanh thu"
                value={`${bookStats.totalRevenue.toLocaleString('vi-VN')}đ`} color="#fbbf24" />
            </>
          )}
        </div>

        {/* ── Tabs ── */}
        {!event.free && (
          <div className="reg-tabs">
            <button className={`reg-tab ${tab === 'registrations' ? 'active' : ''}`}
              onClick={() => { setTab('registrations'); setPage(0); }}>
              📋 Đăng ký miễn phí
              <span className="reg-tab-count">{regStats.total}</span>
            </button>
            <button className={`reg-tab ${tab === 'bookings' ? 'active' : ''}`}
              onClick={() => { setTab('bookings'); setPage(0); }}>
              🪑 Đặt vé có phí
              <span className="reg-tab-count">{bookStats.total}</span>
            </button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="reg-toolbar">
          <div className="reg-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tên, email..."
              value={keyword}
              onChange={e => handleKeywordChange(e.target.value)}
              className="reg-search-input"
            />
            {keyword && (
              <button className="reg-search-clear" onClick={() => handleKeywordChange('')}>×</button>
            )}
          </div>

          <div className="reg-status-filter">
            {['', 'CONFIRMED', 'CANCELLED', ...(tab === 'bookings' ? ['PENDING', 'REFUNDED'] : [])].map(s => (
              <button key={s} className={`reg-filter-chip ${status === s ? 'active' : ''}`}
                onClick={() => handleStatusChange(s)}>
                {s || 'Tất cả'}
              </button>
            ))}
          </div>

          <button className="reg-export-btn" onClick={handleExport}
            disabled={currentList.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Xuất CSV
          </button>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="reg-loading-spinner" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="reg-empty">
            <span>📭</span>
            <p>{keyword || status ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có người đăng ký'}</p>
            {(keyword || status) && (
              <button onClick={() => { setKeyword(''); setStatus(''); handleStatusChange(''); }}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : tab === 'registrations' ? (
          <div className="reg-table-wrap">
            <table className="reg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Thời gian đăng ký</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, idx) => (
                  <tr key={r._id || r.id}>
                    <td className="reg-num">{page * 20 + idx + 1}</td>
                    <td>
                      <div className="reg-user-cell">
                        <div className="reg-avatar">{r.userFullName?.[0]?.toUpperCase() || '?'}</div>
                        <strong>{r.userFullName}</strong>
                      </div>
                    </td>
                    <td className="reg-email">{r.userEmail}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="reg-date">{new Date(r.createdAt).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={currentPagination.totalPages} onChange={handlePageChange} />
          </div>
        ) : (
          <div className="reg-table-wrap">
            <table className="reg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Họ tên</th>
                  <th>Khu vực</th>
                  <th>Số ghế</th>
                  <th>Giá/ghế</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thời gian đặt</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, idx) => (
                  <tr key={b._id || b.id}>
                    <td className="reg-num">{page * 20 + idx + 1}</td>
                    <td>
                      <div className="reg-user-cell">
                        <div className="reg-avatar">{b.userFullName?.[0]?.toUpperCase() || '?'}</div>
                        <strong>{b.userFullName}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="reg-zone-badge">{b.zoneName}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.quantity}</td>
                    <td style={{ color: '#a78bfa' }}>{b.pricePerSeat?.toLocaleString('vi-VN')}đ</td>
                    <td style={{ color: '#fbbf24', fontWeight: 700 }}>{b.totalPrice?.toLocaleString('vi-VN')}đ</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="reg-date">{new Date(b.createdAt).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Revenue summary row */}
            {tab === 'bookings' && bookings.length > 0 && (
              <div className="reg-revenue-bar">
                <span>Tổng doanh thu (trang này):</span>
                <strong style={{ color: '#fbbf24' }}>
                  {bookings.reduce((s, b) => s + (b.totalPrice || 0), 0).toLocaleString('vi-VN')}đ
                </strong>
                <span style={{ marginLeft: '1.5rem' }}>Tổng ghế:</span>
                <strong style={{ color: '#60a5fa' }}>
                  {bookings.reduce((s, b) => s + (b.quantity || 0), 0)}
                </strong>
              </div>
            )}

            <Pagination page={page} totalPages={currentPagination.totalPages} onChange={handlePageChange} />
          </div>
        )}
      </div>
    </>
  );
}
