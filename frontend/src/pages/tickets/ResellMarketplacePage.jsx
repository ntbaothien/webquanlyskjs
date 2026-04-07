import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axiosInstance from '../../utils/axiosInstance';

export default function ResellMarketplacePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState('market'); // market | myListings
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellForm, setSellForm] = useState({ ticketId: '', listingPrice: '' });
  const [selling, setSelling] = useState(false);
  const [msg, setMsg] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchMarket = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/marketplace?page=${page}&size=12`);
      setListings(data.content || []);
      setTotal(data.totalElements || 0);
    } catch (e) {}
    setLoading(false);
  };

  const fetchMyListings = async () => {
    if (!user) return;
    try {
      const { data } = await axiosInstance.get(`/marketplace/my`);
      setMyListings(data.data || []);
    } catch (e) {}
  };

  const fetchMyTickets = async () => {
    if (!user) return;
    try {
      const { data } = await axiosInstance.get(`/my-tickets`);
      const tickets = (data.tickets || []).filter(t => t.status === 'ACTIVE');
      setMyTickets(tickets);
    } catch (e) {}
  };

  useEffect(() => { fetchMarket(); }, [page]);
  useEffect(() => { fetchMyListings(); fetchMyTickets(); }, [user]);

  const handleBuy = async (listingId, price) => {
    if (!user) { navigate('/login'); return; }
    if (!confirm(`Xác nhận mua vé với giá ${price.toLocaleString('vi-VN')}đ?`)) return;
    try {
      const { data } = await axiosInstance.post(`/marketplace/${listingId}/buy`);
      setMsg({ type: 'success', text: data.message });
      fetchMarket();
      fetchMyListings();
    } catch (e) { 
      setMsg({ type: 'error', text: e.response?.data?.error || 'Đã xảy ra lỗi' }); 
    }
  };

  const handleSell = async () => {
    if (!sellForm.ticketId || !sellForm.listingPrice) return;
    setSelling(true);
    try {
      const { data } = await axiosInstance.post(`/marketplace`, sellForm);
      setMsg({ type: 'success', text: data.message });
      setShowSellModal(false);
      setSellForm({ ticketId: '', listingPrice: '' });
      fetchMarket(); fetchMyListings(); fetchMyTickets();
    } catch (e) { 
      setMsg({ type: 'error', text: e.response?.data?.error || 'Đã xảy ra lỗi' }); 
    }
    setSelling(false);
  };

  const handleCancelListing = async (id) => {
    if (!confirm('Xác nhận hủy đăng bán vé này?')) return;
    try {
      const { data } = await axiosInstance.delete(`/marketplace/${id}`);
      setMsg({ type: 'success', text: data.message });
      fetchMyListings(); fetchMyTickets();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Đã xảy ra lỗi' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a3e 0%, #2d1b69 50%, #1a0a2e 100%)',
        padding: '3rem 1rem 2.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 60% 20%, rgba(167,139,250,0.15) 0%, transparent 60%)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏪</div>
          <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
            Chợ Bán Lại Vé
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', margin: '0 0 1.5rem' }}>
            Mua bán vé an toàn — Vé mới 100% được tái phát hành khi sang tên
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { icon: '✅', text: 'Vé xác thực' },
              { icon: '🔄', text: 'Tái phát hành khi mua' },
              { icon: '💰', text: 'Phí nền tảng 5%' },
            ].map(b => (
              <div key={b.text} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '20px', padding: '0.35rem 0.9rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)'
              }}>
                {b.icon} {b.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Msg */}
        {msg && (
          <div style={{
            padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem',
            background: msg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>{msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}</span>
            <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.1rem' }}>×</button>
          </div>
        )}

        {/* Tabs + Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { key: 'market', label: '🏪 Chợ vé', count: total },
              { key: 'myListings', label: '📋 Vé đang bán', count: myListings.length },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '0.6rem 1.25rem', borderRadius: '24px', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.9rem', border: '1px solid',
                background: tab === t.key ? 'var(--purple)' : 'transparent',
                borderColor: tab === t.key ? 'var(--purple)' : 'var(--border)',
                color: tab === t.key ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}>
                {t.label} {t.count > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '10px', padding: '0 0.4rem', fontSize: '0.75rem', marginLeft: '0.3rem' }}>{t.count}</span>}
              </button>
            ))}
          </div>
          {user && (
            <button onClick={() => setShowSellModal(true)} style={{
              padding: '0.65rem 1.5rem', borderRadius: '24px', background: 'var(--accent)',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
            }}>
              + Đăng bán vé
            </button>
          )}
        </div>

        {/* Market Tab */}
        {tab === 'market' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Đang tải...</div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏪</div>
                <p>Chợ hiện chưa có vé nào. Hãy là người đầu tiên đăng bán!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {listings.map(listing => (
                  <ResellCard key={listing._id} listing={listing} onBuy={handleBuy} currentUserId={user?._id} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Listings Tab */}
        {tab === 'myListings' && (
          <div>
            {myListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <p>Bạn chưa đăng bán vé nào</p>
                <button onClick={() => setShowSellModal(true)} style={{
                  marginTop: '1rem', padding: '0.65rem 1.5rem', borderRadius: '24px',
                  background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600
                }}>Đăng bán ngay</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {myListings.map(listing => (
                  <MyListingCard key={listing._id} listing={listing} onCancel={handleCancelListing} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sell Modal */}
      {showSellModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }} onClick={e => e.target === e.currentTarget && setShowSellModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px', padding: '2rem',
            width: '100%', maxWidth: '460px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>🏷️ Đăng bán vé</h2>
              <button onClick={() => setShowSellModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.4rem' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Chọn vé muốn bán</label>
                <select value={sellForm.ticketId} onChange={e => setSellForm(p => ({ ...p, ticketId: e.target.value }))} style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: '0.9rem'
                }}>
                  <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>-- Chọn vé --</option>
                  {myTickets.map(t => (
                    <option key={t._id} value={t._id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {t.eventTitle} — Khu {t.zoneName} ({t.ticketCode})
                    </option>
                  ))}
                </select>
                {myTickets.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Không có vé hợp lệ để bán</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Giá bán (đ)</label>
                <input
                  type="number" min="0" value={sellForm.listingPrice}
                  onChange={e => setSellForm(p => ({ ...p, listingPrice: e.target.value }))}
                  placeholder="Nhập giá bán..."
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.9rem'
                  }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  💡 Giá không được vượt quá 150% giá gốc. Phí nền tảng 5% sẽ được khấu trừ khi bán.
                </p>
              </div>

              {sellForm.listingPrice > 0 && (
                <div style={{
                  background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
                  borderRadius: '12px', padding: '1rem', fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Giá bán</span>
                    <strong>{Number(sellForm.listingPrice).toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phí nền tảng (5%)</span>
                    <span style={{ color: 'var(--danger)' }}>-{Math.round(Number(sellForm.listingPrice) * 0.05).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontWeight: 700 }}>
                    <span>Bạn nhận được</span>
                    <span style={{ color: 'var(--success)' }}>{Math.round(Number(sellForm.listingPrice) * 0.95).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              )}

              <button onClick={handleSell} disabled={selling || !sellForm.ticketId || !sellForm.listingPrice} style={{
                padding: '0.85rem', borderRadius: '12px', background: 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem',
                opacity: (selling || !sellForm.ticketId || !sellForm.listingPrice) ? 0.6 : 1
              }}>
                {selling ? 'Đang đăng...' : '🚀 Đăng bán ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResellCard({ listing, onBuy, currentUserId }) {
  const event = listing.eventId || {};
  const seller = listing.sellerId || {};
  const isMine = currentUserId && seller._id === currentUserId;

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow)', transition: 'transform 0.2s, box-shadow 0.2s'
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
    >
      {/* Event banner */}
      {event.bannerImagePath && (
        <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
          <img src={`http://localhost:5000${event.bannerImagePath}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
          <div style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            background: 'rgba(0,0,0,0.6)', borderRadius: '20px', padding: '0.25rem 0.7rem',
            fontSize: '0.75rem', color: '#fff', backdropFilter: 'blur(4px)'
          }}>Chợ vé</div>
        </div>
      )}

      <div style={{ padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>
          {listing.eventTitle}
        </h4>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          🎟️ Khu {listing.zoneName}
          {listing.eventDate && (
            <span> · 📅 {new Date(listing.eventDate).toLocaleDateString('vi-VN')}</span>
          )}
        </div>

        {/* Seller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem'
          }}>
            {seller.avatarUrl ? <img src={`http://localhost:5000${seller.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : (seller.fullName?.[0] || '?')}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{seller.fullName}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--purple)' }}>
              {listing.listingPrice.toLocaleString('vi-VN')}đ
            </div>
            {listing.originalPrice > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                Gốc: {listing.originalPrice.toLocaleString('vi-VN')}đ
              </div>
            )}
          </div>
          {!isMine && (
            <button onClick={() => onBuy(listing._id, listing.listingPrice)} style={{
              padding: '0.55rem 1.25rem', borderRadius: '20px', background: 'var(--accent)',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}>
              Mua ngay
            </button>
          )}
          {isMine && (
            <span style={{
              padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem',
              background: 'rgba(167,139,250,0.15)', color: 'var(--purple)', fontWeight: 600
            }}>Vé của bạn</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MyListingCard({ listing, onCancel }) {
  const statusColor = listing.status === 'ACTIVE' ? '#22c55e' : listing.status === 'SOLD' ? '#6c63ff' : '#ef4444';
  const statusLabel = listing.status === 'ACTIVE' ? 'Đang bán' : listing.status === 'SOLD' ? 'Đã bán' : 'Đã hủy';

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{listing.eventTitle}</h4>
        <span style={{
          padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
          background: `${statusColor}20`, color: statusColor
        }}>{statusLabel}</span>
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        🎟️ Khu {listing.zoneName || (listing.ticketId?.zoneName)}
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--purple)', marginBottom: '0.75rem' }}>
        {listing.listingPrice.toLocaleString('vi-VN')}đ
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1rem' }}>
        Đăng lúc: {new Date(listing.createdAt).toLocaleDateString('vi-VN')}
      </div>
      {listing.status === 'ACTIVE' && (
        <button onClick={() => onCancel(listing._id)} style={{
          width: '100%', padding: '0.55rem', borderRadius: '10px', cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem'
        }}>
          Hủy đăng bán
        </button>
      )}
    </div>
  );
}
