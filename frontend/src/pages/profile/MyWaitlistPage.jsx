import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import { getImageUrl } from '../../utils/getImageUrl';
import Navbar from '../../components/common/Navbar';

export default function MyWaitlistPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  useEffect(() => {
    axiosInstance.get('/events/waitlist/my')
      .then(r => setEntries(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLeave = async (eventId, entryId) => {
    setRemovingId(entryId);
    try {
      await axiosInstance.delete(`/events/${eventId}/waitlist`);
      setEntries(prev => prev.filter(e => e._id !== entryId));
    } catch {}
    finally { setRemovingId(null); }
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.35rem' }}>
              🔔 {t('waitlist.myWaitlistTitle')}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
              {t('waitlist.myWaitlistDesc')}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>{t('common.loading')}</p>
            </div>
          ) : entries.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '5rem 2rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>{t('waitlist.emptyTitle')}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {t('waitlist.emptyDesc')}
              </p>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #e94560, #6c63ff)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                🔍 {t('waitlist.browseEvents')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {entries.map(entry => {
                const banner = getImageUrl(entry.eventBanner);
                const isRemoving = removingId === entry._id;
                return (
                  <div key={entry._id} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    display: 'flex',
                    gap: '1rem',
                    transition: 'border-color 0.2s',
                  }}>
                    {/* Banner thumbnail */}
                    <div style={{ width: 110, minHeight: 90, flexShrink: 0, overflow: 'hidden' }}>
                      {banner ? (
                        <img
                          src={banner}
                          alt={entry.eventTitle}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', minHeight: 90,
                          background: 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(233,69,96,0.3))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.8rem'
                        }}>🎫</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, padding: '0.9rem 0.75rem 0.9rem 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link
                            to={`/events/${entry.eventId}`}
                            style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', textDecoration: 'none' }}
                            onMouseOver={e => e.currentTarget.style.color = '#a78bfa'}
                            onMouseOut={e => e.currentTarget.style.color = '#fff'}
                          >
                            {entry.eventTitle}
                          </Link>
                          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                            {entry.eventFree
                              ? <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(76,175,80,0.15)', color: '#81c784' }}>🆓 {t('eventDetail.free')}</span>
                              : <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,193,7,0.15)', color: '#ffc107' }}>💳 {t('eventDetail.paid')}</span>
                            }
                            {entry.isPast && (
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                                🏁 {t('eventDetail.eventHasEnded')}
                              </span>
                            )}
                            {entry.notified && (
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                                ✉️ {t('waitlist.notified')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          {entry.eventLocation && (
                            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>📍 {entry.eventLocation}</span>
                          )}
                          {entry.eventStartDate && (
                            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>📅 {formatDate(entry.eventStartDate)}</span>
                          )}
                          {!entry.isPast && entry.spotsLeft > 0 && (
                            <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 600 }}>
                              ✅ {t('waitlist.spotsAvailableNow', { count: entry.spotsLeft })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                          🕐 {t('waitlist.joinedAt')}: {new Date(entry.createdAt).toLocaleDateString(locale)}
                        </span>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!entry.isPast && entry.spotsLeft > 0 && (
                            <button
                              onClick={() => navigate(`/events/${entry.eventId}${entry.eventFree ? '' : '/book'}`)}
                              style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, rgba(76,175,80,0.2), rgba(76,175,80,0.1))',
                                border: '1px solid rgba(76,175,80,0.4)',
                                color: '#4ade80',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {entry.eventFree ? `🎟 ${t('eventDetail.registerFree')}` : `🪑 ${t('eventDetail.selectSeatsBook')}`}
                            </button>
                          )}
                          <button
                            onClick={() => handleLeave(entry.eventId, entry._id)}
                            disabled={isRemoving}
                            style={{
                              padding: '0.35rem 0.85rem',
                              borderRadius: '8px',
                              background: 'rgba(248,113,113,0.1)',
                              border: '1px solid rgba(248,113,113,0.3)',
                              color: '#f87171',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: isRemoving ? 'not-allowed' : 'pointer',
                              opacity: isRemoving ? 0.5 : 1
                            }}
                          >
                            {isRemoving ? '...' : `🔕 ${t('waitlist.leave')}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
