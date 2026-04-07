import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

const TIER_CONFIG = {
  BRONZE: { icon: '🥉', color: '#cd7f32', gradient: 'linear-gradient(135deg, #cd7f32, #a0522d)', label: 'Đồng' },
  SILVER: { icon: '🥈', color: '#c0c0c0', gradient: 'linear-gradient(135deg, #c0c0c0, #808080)', label: 'Bạc' },
  GOLD:   { icon: '🥇', color: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700, #ffa500)', label: 'Vàng' },
  PLATINUM: { icon: '💎', color: '#e5e4e2', gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)', label: 'Bạch kim' },
};

const ACTION_LABELS = {
  BUY_TICKET: '🎫 Mua vé',
  LEAVE_REVIEW: '⭐ Đánh giá',
  DAILY_LOGIN: '📅 Đăng nhập',
  REGISTER_FREE_EVENT: '📝 Đăng ký miễn phí',
  BUY_RESELL_TICKET: '🛒 Mua vé chợ',
  SHARE_EVENT: '📤 Chia sẻ',
};

export default function LoyaltyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get(`/users/me/loyalty`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✨</div>
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải thông tin điểm thưởng...</p>
      </div>
    </div>
  );

  if (!data) return null;

  const tier = TIER_CONFIG[data.loyaltyTier] || TIER_CONFIG.BRONZE;
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '4rem' }}>
      {/* Hero Header */}
      <div style={{
        background: tier.gradient,
        padding: '3rem 1rem 4rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background blur circles */}
        <div style={{
          position: 'absolute', top: '-20px', right: '10%', width: '200px', height: '200px',
          borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-30px', left: '5%', width: '150px', height: '150px',
          borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(30px)'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link to="/profile" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '1.5rem',
            textDecoration: 'none', background: 'rgba(0,0,0,0.15)', padding: '0.4rem 1rem',
            borderRadius: '20px', backdropFilter: 'blur(4px)'
          }}>
            ← Quay về Profile
          </Link>

          <div style={{ fontSize: '5rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
            {tier.icon}
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
            {data.loyaltyTier === 'BRONZE' ? 'Thành viên Đồng' :
             data.loyaltyTier === 'SILVER' ? 'Thành viên Bạc' :
             data.loyaltyTier === 'GOLD' ? 'Thành viên Vàng' : 'Thành viên Bạch Kim'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', margin: 0 }}>
            {data.loyaltyPoints.toLocaleString('vi-VN')} điểm tích lũy
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '780px', margin: '-2rem auto 0', padding: '0 1rem' }}>
        {/* Progress Card */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: '1.5rem'
        }}>
          {data.nextTier ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Hạng hiện tại</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {TIER_CONFIG[data.loyaltyTier]?.icon} {TIER_CONFIG[data.loyaltyTier]?.label}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Hạng tiếp theo</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {TIER_CONFIG[data.nextTier]?.icon} {TIER_CONFIG[data.nextTier]?.label}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '12px', background: 'var(--bg-input)', borderRadius: '6px',
                overflow: 'hidden', marginBottom: '0.75rem'
              }}>
                <div style={{
                  height: '100%',
                  width: `${data.currentTierProgress}%`,
                  background: tier.gradient,
                  borderRadius: '6px',
                  transition: 'width 0.8s ease',
                  boxShadow: `0 0 10px ${tier.color}60`
                }} />
              </div>

              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Còn <strong style={{ color: tier.color }}>{data.pointsToNextTier.toLocaleString('vi-VN')} điểm</strong> để lên hạng {TIER_CONFIG[data.nextTier]?.label}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👑</div>
              <div style={{ fontWeight: 700 }}>Bạn đã đạt hạng cao nhất!</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Hạng Bạch Kim — Tận hưởng tất cả đặc quyền VIP
              </div>
            </div>
          )}
        </div>

        {/* Tier Roadmap */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>🗺️ Bản đồ hạng thành viên</h3>
          <div style={{ display: 'flex', position: 'relative' }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute', top: '24px', left: '12%', right: '12%',
              height: '3px', background: 'var(--border)', zIndex: 0
            }} />

            {tiers.map((t, i) => {
              const tc = TIER_CONFIG[t];
              const isActive = t === data.loyaltyTier;
              const isPast = tiers.indexOf(data.loyaltyTier) > i;
              return (
                <div key={t} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 0.5rem',
                    background: (isActive || isPast) ? tc.gradient : 'var(--bg-input)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', border: isActive ? `3px solid ${tc.color}` : '3px solid transparent',
                    boxShadow: isActive ? `0 0 16px ${tc.color}60` : 'none',
                    transition: 'all 0.3s'
                  }}>
                    {isPast || isActive ? tc.icon : '🔒'}
                  </div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
                    color: isActive ? tc.color : 'var(--text-secondary)'
                  }}>{tc.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {data.thresholds[t] > 0 ? `${data.thresholds[t]} đ` : 'Bắt đầu'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits & Badges Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Benefits */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px', padding: '1.5rem',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow)'
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>🎁 Đặc quyền của bạn</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {data.benefits.map((b, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0', borderBottom: i < data.benefits.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: '0.85rem', color: 'var(--text-primary)'
                }}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: tier.gradient, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0
                  }}>✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Badges */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px', padding: '1.5rem',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow)'
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>🏅 Huy hiệu đạt được</h3>
            {data.badges && data.badges.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {data.badges.map(b => (
                  <div key={b} style={{
                    padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem',
                    fontWeight: 600, background: tier.gradient, color: '#fff',
                    boxShadow: `0 2px 8px ${tier.color}40`
                  }}>
                    {b.replace('TIER_', '').replace('_', ' ')}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>
                Chưa có huy hiệu nào
              </p>
            )}
          </div>
        </div>

        {/* How to earn points */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: '1.5rem'
        }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>💡 Cách tích điểm</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {[
              { action: 'BUY_TICKET', pts: 50, desc: 'Mua vé sự kiện' },
              { action: 'LEAVE_REVIEW', pts: 10, desc: 'Để lại đánh giá' },
              { action: 'REGISTER_FREE_EVENT', pts: 5, desc: 'Đăng ký miễn phí' },
              { action: 'BUY_RESELL_TICKET', pts: 20, desc: 'Mua vé chợ' },
            ].map(item => (
              <div key={item.action} style={{
                background: 'var(--bg-input)', borderRadius: '12px', padding: '1rem',
                textAlign: 'center', border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                  {ACTION_LABELS[item.action]?.split(' ')[0] || '⭐'}
                </div>
                <div style={{
                  fontWeight: 800, fontSize: '1.2rem', color: tier.color, marginBottom: '0.25rem'
                }}>+{item.pts}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Point History */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px', padding: '1.75rem',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>📜 Lịch sử điểm thưởng</h3>
          {data.recentHistory && data.recentHistory.length > 0 ? (
            <div>
              {data.recentHistory.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: i < data.recentHistory.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'var(--bg-input)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1.1rem'
                    }}>
                      {ACTION_LABELS[item.action]?.split(' ')[0] || '⭐'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {ACTION_LABELS[item.action]?.slice(2) || item.action}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {item.description && item.description !== item.action && item.description}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                        {new Date(item.earnedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: '1rem', color: '#22c55e',
                    background: 'rgba(34,197,94,0.1)', padding: '0.25rem 0.75rem',
                    borderRadius: '20px', whiteSpace: 'nowrap'
                  }}>
                    +{item.points}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
              <p>Chưa có lịch sử điểm. Hãy mua vé để bắt đầu tích điểm!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
