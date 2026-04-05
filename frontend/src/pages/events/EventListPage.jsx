import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getImageUrl } from '../../utils/getImageUrl';
import Navbar from '../../components/common/Navbar';
import HeroBanner from '../../components/common/HeroBanner';
import CategoryBar, { getCategoryInfo } from '../../components/common/CategoryBar';
import TrendingSection from '../../components/common/TrendingSection';
import { SkeletonList } from '../../components/common/Skeleton';
import './Events.css';

const SORT_OPTIONS = [
  { value: 'date_asc',  label: '📅 Ngày gần nhất' },
  { value: 'date_desc', label: '📅 Ngày xa nhất' },
  { value: 'popular',   label: '🔥 Phổ biến nhất' },
  { value: 'newest',    label: '✨ Mới đăng nhất' },
];

const TIME_STATUS_OPTIONS = [
  { value: '',         label: '📋 Tất cả' },
  { value: 'upcoming', label: '⏳ Sắp diễn ra' },
  { value: 'ongoing',  label: '▶️ Đang diễn ra' },
  { value: 'past',     label: '🏁 Đã kết thúc' },
];

export default function EventListPage() {
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [locations, setLocations] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  // Read all filters from URL
  const keyword    = searchParams.get('keyword') || '';
  const tag        = searchParams.get('tag') || '';
  const location   = searchParams.get('location') || '';
  const timeFilter = searchParams.get('time') || '';
  const timeStatus = searchParams.get('timeStatus') || '';
  const freeFilter = searchParams.get('free') || '';
  const priceMax   = searchParams.get('priceMax') || '';
  const sortBy     = searchParams.get('sort') || 'date_asc';
  const dateFrom   = searchParams.get('dateFrom') || '';
  const dateTo     = searchParams.get('dateTo') || '';
  const organizer  = searchParams.get('organizer') || '';
  const page = parseInt(searchParams.get('page') || '0');

  // Sync search input with URL keyword
  useEffect(() => { setSearchInput(keyword); }, [keyword]);

  // Load trending + featured + locations once
  useEffect(() => {
    axiosInstance.get('/events/trending').then(r => setTrending(r.data)).catch(() => {});
    axiosInstance.get('/events/featured').then(r => setFeatured(r.data)).catch(() => {});
    axiosInstance.get('/events/locations').then(r => setLocations(r.data)).catch(() => {});
  }, []);

  // Load events with all filters
  useEffect(() => {
    setLoading(true);
    const params = { page, size: 9, sort: sortBy };
    if (keyword) params.keyword = keyword;
    if (organizer) params.organizer = organizer;
    if (tag) params.tag = tag;
    if (location) params.location = location;
    if (freeFilter) params.free = freeFilter;
    if (freeFilter === 'false' && priceMax) params.priceMax = priceMax;
    if (timeStatus) params.timeStatus = timeStatus;

    // Custom date range
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    // Quick time shortcuts (only if no custom dates or timeStatus)
    if (!timeStatus && !dateFrom && !dateTo) {
      if (timeFilter === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        params.dateFrom = today;
        params.dateTo = today;
      } else if (timeFilter === 'weekend') {
        const now = new Date();
        const sat = new Date(now);
        sat.setDate(now.getDate() + (6 - now.getDay()));
        const sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        params.dateFrom = sat.toISOString().slice(0, 10);
        params.dateTo = sun.toISOString().slice(0, 10);
      } else if (timeFilter === 'month') {
        const now = new Date();
        params.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        params.dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      }
    }

    axiosInstance.get('/events', { params })
      .then(r => {
        setEvents(r.data.content || []);
        setTotalPages(r.data.totalPages || 0);
        setTotalElements(r.data.totalElements || 0);
      })
      .finally(() => setLoading(false));
  }, [keyword, organizer, tag, location, page, timeFilter, timeStatus, freeFilter, priceMax, sortBy, dateFrom, dateTo]);

  const updateFilter = useCallback((key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val !== '' && val !== null && val !== undefined) next.set(key, val);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const updateMultiple = useCallback((updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) next.set(k, v);
      else next.delete(k);
    });
    next.delete('page');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const clearAllFilters = () => setSearchParams({});

  // Debounced search as user types
  const handleSearchChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateFilter('keyword', val), 500);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    updateFilter('keyword', searchInput);
  };

  const getMinPrice = (event) => {
    if (event.free !== false) return null;
    if (!event.seatZones || event.seatZones.length === 0) return 0;
    return Math.min(...event.seatZones.map(z => z.price));
  };

  const isHot = (event) =>
    event.maxCapacity > 0 && event.currentAttendees / event.maxCapacity >= 0.8;

  const getCountdown = (startDate) => {
    if (!startDate) return null;
    const diff = new Date(startDate) - new Date();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 30) return null;
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Ngày mai';
    return `Còn ${days} ngày`;
  };

  const tagCategoryInfo = tag ? getCategoryInfo(tag) : null;

  // Count active advanced filters
  const advancedActiveCount = [freeFilter, priceMax, dateFrom, dateTo, timeStatus, organizer]
    .filter(Boolean).length;

  const hasActiveFilters = keyword || tag || location || timeFilter || advancedActiveCount > 0;

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="events-container">
        <HeroBanner events={featured.length ? featured : trending} />
        <CategoryBar selected={tag} onSelect={(t) => updateFilter('tag', t)} />

        {/* ── Quick time buttons ── */}
        <div className="quick-filters">
          <button className={`qf-btn ${timeFilter === '' && !timeStatus ? 'active' : ''}`}
            onClick={() => updateMultiple({ time: '', timeStatus: '' })}>📋 Tất cả</button>
          <button className={`qf-btn ${timeFilter === 'today' ? 'active' : ''}`}
            onClick={() => updateMultiple({ time: 'today', timeStatus: '' })}>📅 Hôm nay</button>
          <button className={`qf-btn ${timeFilter === 'weekend' ? 'active' : ''}`}
            onClick={() => updateMultiple({ time: 'weekend', timeStatus: '' })}>🌙 Cuối tuần</button>
          <button className={`qf-btn ${timeFilter === 'month' ? 'active' : ''}`}
            onClick={() => updateMultiple({ time: 'month', timeStatus: '' })}>📆 Tháng này</button>
        </div>

        {/* ── Main search bar ── */}
        <form className="search-main-bar" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrap">
            <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện, ban tổ chức, tags..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {searchInput && (
              <button type="button" className="search-clear-btn"
                onClick={() => { setSearchInput(''); updateFilter('keyword', ''); }}>×</button>
            )}
          </div>

          <select className="search-location-select" value={location}
            onChange={e => updateFilter('location', e.target.value)}>
            <option value="">📍 Tất cả địa điểm</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <select className="search-sort-select" value={sortBy}
            onChange={e => updateFilter('sort', e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button type="button"
            className={`adv-toggle-btn ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(v => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Lọc nâng cao
            {advancedActiveCount > 0 && (
              <span className="adv-badge">{advancedActiveCount}</span>
            )}
          </button>
        </form>

        {/* ── Advanced filter panel ── */}
        {showAdvanced && (
          <div className="advanced-panel">
            {/* Row 1: Price type + Status */}
            <div className="adv-row">
              <div className="adv-group">
                <label className="adv-label">Loại vé</label>
                <div className="adv-toggle-group">
                  <button className={`adv-toggle ${freeFilter === '' ? 'active' : ''}`}
                    onClick={() => updateMultiple({ free: '', priceMax: '' })}>Tất cả</button>
                  <button className={`adv-toggle ${freeFilter === 'true' ? 'active' : ''}`}
                    onClick={() => updateMultiple({ free: 'true', priceMax: '' })}>🆓 Miễn phí</button>
                  <button className={`adv-toggle ${freeFilter === 'false' ? 'active' : ''}`}
                    onClick={() => updateFilter('free', 'false')}>💳 Có phí</button>
                </div>
              </div>

              <div className="adv-group">
                <label className="adv-label">Trạng thái</label>
                <div className="adv-toggle-group">
                  {TIME_STATUS_OPTIONS.map(o => (
                    <button key={o.value}
                      className={`adv-toggle ${timeStatus === o.value ? 'active' : ''}`}
                      onClick={() => updateMultiple({ timeStatus: o.value, time: '' })}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Price max (paid only) + Organizer */}
            <div className="adv-row">
              {freeFilter === 'false' && (
                <div className="adv-group">
                  <label className="adv-label">
                    Giá tối đa: <strong style={{ color: '#a78bfa' }}>
                      {priceMax ? Number(priceMax).toLocaleString('vi-VN') + 'đ' : 'Không giới hạn'}
                    </strong>
                  </label>
                  <div className="adv-price-row">
                    <input type="range" min="0" max="5000000" step="100000"
                      value={priceMax || 5000000}
                      onChange={e => updateFilter('priceMax', e.target.value === '5000000' ? '' : e.target.value)}
                      className="adv-range" />
                    <div className="adv-range-labels">
                      <span>0đ</span><span>5,000,000đ</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="adv-group">
                <label className="adv-label">Ban tổ chức</label>
                <input type="text" placeholder="Tìm theo tên ban tổ chức..."
                  className="adv-input"
                  value={organizer}
                  onChange={e => updateFilter('organizer', e.target.value)} />
              </div>
            </div>

            {/* Row 3: Date range */}
            <div className="adv-row">
              <div className="adv-group">
                <label className="adv-label">Từ ngày</label>
                <input type="date" className="adv-input"
                  value={dateFrom}
                  onChange={e => updateMultiple({ dateFrom: e.target.value, time: '' })} />
              </div>
              <div className="adv-group">
                <label className="adv-label">Đến ngày</label>
                <input type="date" className="adv-input"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={e => updateMultiple({ dateTo: e.target.value, time: '' })} />
              </div>
              <div className="adv-group adv-group-actions">
                <button className="adv-reset-btn" onClick={() => {
                  updateMultiple({ free: '', priceMax: '', timeStatus: '', dateFrom: '', dateTo: '', organizer: '' });
                }}>
                  Đặt lại bộ lọc nâng cao
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Active filter chips ── */}
        {hasActiveFilters && (
          <div className="active-filters">
            <span className="af-label">Bộ lọc:</span>
            {keyword && (
              <span className="af-chip" onClick={() => { setSearchInput(''); updateFilter('keyword', ''); }}>
                🔍 "{keyword}" ×
              </span>
            )}
            {tag && (tagCategoryInfo ? (
              <span className="af-chip af-chip-cat" onClick={() => updateFilter('tag', '')}
                style={{ background: tagCategoryInfo.gradient }}>
                {tagCategoryInfo.icon} {tagCategoryInfo.label} ×
              </span>
            ) : (
              <span className="af-chip" onClick={() => updateFilter('tag', '')}>🏷️ {tag} ×</span>
            ))}
            {location && (
              <span className="af-chip" onClick={() => updateFilter('location', '')}>📍 {location} ×</span>
            )}
            {timeFilter && (
              <span className="af-chip" onClick={() => updateFilter('time', '')}>
                📅 {timeFilter === 'today' ? 'Hôm nay' : timeFilter === 'weekend' ? 'Cuối tuần' : 'Tháng này'} ×
              </span>
            )}
            {timeStatus && (
              <span className="af-chip" onClick={() => updateFilter('timeStatus', '')}>
                {TIME_STATUS_OPTIONS.find(o => o.value === timeStatus)?.label} ×
              </span>
            )}
            {freeFilter === 'true' && (
              <span className="af-chip" onClick={() => updateMultiple({ free: '', priceMax: '' })}>🆓 Miễn phí ×</span>
            )}
            {freeFilter === 'false' && (
              <span className="af-chip" onClick={() => updateMultiple({ free: '', priceMax: '' })}>
                💳 Có phí{priceMax ? ` ≤ ${Number(priceMax).toLocaleString('vi-VN')}đ` : ''} ×
              </span>
            )}
            {dateFrom && (
              <span className="af-chip" onClick={() => updateFilter('dateFrom', '')}>📅 Từ {dateFrom} ×</span>
            )}
            {dateTo && (
              <span className="af-chip" onClick={() => updateFilter('dateTo', '')}>📅 Đến {dateTo} ×</span>
            )}
            {organizer && (
              <span className="af-chip" onClick={() => updateFilter('organizer', '')}>🏢 {organizer} ×</span>
            )}
            <button className="af-clear" onClick={clearAllFilters}>Xóa tất cả</button>
          </div>
        )}

        {/* Trending Section — only when no filters active */}
        {!keyword && !tag && !freeFilter && !timeStatus && !organizer && page === 0 && (
          <TrendingSection events={trending} />
        )}

        {/* ── Section header ── */}
        <div className="section-header">
          <h3 className="section-title">
            {tag && tagCategoryInfo
              ? `${tagCategoryInfo.icon} ${tagCategoryInfo.label}`
              : tag ? `🏷️ ${tag}` : '🎫 Tất cả sự kiện'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!loading && <span className="section-count">{totalElements} sự kiện</span>}
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
              {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            </span>
          </div>
        </div>

        {/* ── Event Grid ── */}
        {loading ? <SkeletonList count={6} /> : (
          events.length === 0 ? (
            <div className="empty-state">
              <span className="empty-emoji">🎭</span>
              <p>Không tìm thấy sự kiện nào</p>
              {hasActiveFilters && (
                <button className="empty-clear" onClick={clearAllFilters}>Xóa bộ lọc</button>
              )}
            </div>
          ) : (
            <div className="events-grid">
              {events.map(event => {
                const minPrice = getMinPrice(event);
                const eventImage = getImageUrl(event.bannerImagePath);
                const countdown = getCountdown(event.startDate);
                const isPast = new Date(event.endDate || event.startDate) < new Date();
                const firstTag = event.tags?.[0];
                const firstTagInfo = firstTag ? getCategoryInfo(firstTag) : null;
                return (
                  <div key={event._id} className={`event-card${isPast ? ' event-card-past' : ''}`}
                    onClick={() => navigate(`/events/${event._id}`)}>
                    {!isPast && isHot(event) && <span className="hot-badge">🔥 HOT</span>}
                    {isPast && <span className="hot-badge" style={{ background: 'rgba(107,114,128,0.85)' }}>🏁 Đã kết thúc</span>}
                    <div className="event-img"
                      style={{
                        backgroundImage: eventImage
                          ? `linear-gradient(rgba(8,8,20,${isPast ? '0.5' : '0.15'}), rgba(8,8,20,${isPast ? '0.6' : '0.35'})), url(${eventImage})`
                          : 'linear-gradient(135deg, #6c63ff 0%, #3f3d9e 100%)'
                      }}>
                      <span className="event-date-badge">
                        {event.startDate
                          ? new Date(event.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })
                          : '—'}
                      </span>
                      {!isPast && countdown && <span className="event-countdown">{countdown}</span>}
                    </div>
                    <div className="event-body">
                      <h4 className="event-title">{event.title}</h4>
                      <div className="event-meta">
                        <span>📍 {event.location}</span>
                        <span>👥 {event.currentAttendees || 0}</span>
                      </div>
                      <div className="event-footer">
                        <span className="event-price">
                          {minPrice === null ? '🆓 Miễn phí' : `💳 Từ ${minPrice.toLocaleString('vi-VN')}đ`}
                        </span>
                        {firstTagInfo ? (
                          <span className="event-cat-badge" style={{ background: firstTagInfo.gradient }}>
                            {firstTagInfo.icon} {firstTagInfo.label}
                          </span>
                        ) : firstTag ? (
                          <span className="event-tag">{firstTag}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 0}
              onClick={() => updateFilter('page', String(page - 1))}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const pageNum = totalPages <= 7 ? i
                : page < 4 ? i
                : page > totalPages - 5 ? totalPages - 7 + i
                : page - 3 + i;
              return (
                <button key={pageNum}
                  className={`page-btn ${pageNum === page ? 'active' : ''}`}
                  onClick={() => updateFilter('page', pageNum === 0 ? '' : String(pageNum))}>
                  {pageNum + 1}
                </button>
              );
            })}
            <button className="page-btn" disabled={page >= totalPages - 1}
              onClick={() => updateFilter('page', String(page + 1))}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
