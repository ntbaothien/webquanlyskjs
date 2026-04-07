import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axiosInstance from '../../utils/axiosInstance';

export default function GroupBuyCheckoutPage() {
  const { inviteCode } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [holdInfo, setHoldInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    axiosInstance.get(`/group-buy/${inviteCode}`)
      .then(r => {
        const d = r.data;
        setHoldInfo(d.hold);
        setLoading(false);
        if (d.hold && !d.hold.isExpired) {
          const expires = new Date(d.hold.expiresAt);
          const update = () => {
            const now = new Date();
            const diff = Math.max(0, expires - now);
            setTimeLeft(diff);
            if (diff > 0) setTimeout(update, 1000);
          };
          update();
        }
      })
      .catch(() => setLoading(false));
  }, [inviteCode]);

  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePay = async () => {
    if (!user) { navigate('/login'); return; }
    setPaying(true);
    try {
      const { data } = await axiosInstance.post(`/group-buy/${inviteCode}/join`);
      setMsg({ type: 'success', text: data.message, allPaid: data.allPaid });
      
      // Cập nhật holdInfo
      const r2 = await axiosInstance.get(`/group-buy/${inviteCode}`);
      setHoldInfo(r2.data.hold);
    } catch (e) { 
      setMsg({ type: 'error', text: e.response?.data?.error || 'Đã xảy ra lỗi' }); 
    }
    setPaying(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setMsg({ type: 'success', text: '✅ Đã sao chép link!' });
    setTimeout(() => setMsg(null), 2000);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👥</div>
        <p>Đang tải thông tin nhóm mua...</p>
      </div>
    </div>
  );

  if (!holdInfo) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😢</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Không tìm thấy nhóm mua</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Link này không hợp lệ hoặc đã hết hạn</p>
        <Link to="/" style={{
          display: 'inline-block', marginTop: '1.5rem', padding: '0.65rem 1.5rem',
          borderRadius: '24px', background: 'var(--accent)', color: '#fff', fontWeight: 600
        }}>Về trang chủ</Link>
      </div>
    </div>
  );

  const hold = holdInfo;
  const myMember = hold.members?.find(m => m.email === user?.email);
  const alreadyPaid = myMember?.isPaid;
  const paidCount = hold.members?.filter(m => m.isPaid).length || 0;
  const totalCount = hold.members?.length || 0;
  const isHost = hold.userId?._id === user?._id || hold.userId === user?._id;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
        padding: '2.5rem 1rem 3rem', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.15), transparent 70%)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👥</div>
          <h1 style={{ color: '#fff', fontSize: '1.7rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
            Mua Nhóm — Chia Hóa Đơn
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            Mã mời: <strong style={{ color: '#fff', letterSpacing: '2px' }}>{inviteCode}</strong>
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '-2rem auto 0', padding: '0 1rem' }}>
        {/* Notification */}
        {msg && (
          <div style={{
            padding: '1rem 1.25rem', borderRadius: '14px', marginBottom: '1.25rem',
            background: msg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: msg.type === 'success' ? '#22c55e' : '#ef4444',
          }}>
            {msg.text}
            {msg.allPaid && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#22c55e' }}>
                🎉 Tất cả thành viên đã trả xong! Vé đã được phát hành vào tài khoản.
              </div>
            )}
          </div>
        )}

        {/* Expired Warning */}
        {hold.isExpired && (
          <div style={{
            padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', textAlign: 'center',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⏰</div>
            <strong style={{ color: '#ef4444' }}>Phiên nhóm mua đã hết hạn</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              Vui lòng yêu cầu host tạo lại nhóm mua mới
            </p>
          </div>
        )}

        {/* Countdown Timer */}
        {!hold.isExpired && timeLeft !== null && (
          <div style={{
            background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem',
            border: '1px solid var(--border)', marginBottom: '1.25rem', textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              ⏳ Thời gian còn lại để thanh toán
            </div>
            <div style={{
              fontSize: '2.5rem', fontWeight: 800,
              color: timeLeft < 5 * 60 * 1000 ? '#ef4444' : '#22c55e'
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        )}

        {/* Event & Hold Info */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px', padding: '1.5rem',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: '1.25rem'
        }}>
          <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>📋 Thông tin đặt nhóm</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
            {[
              { icon: '🎪', label: 'Sự kiện', value: hold.eventId?.title || 'N/A' },
              { icon: '🎟️', label: 'Khu vực', value: `${hold.zoneName} — ${hold.zonePrice?.toLocaleString('vi-VN')}đ/ghế` },
              { icon: '🪑', label: 'Số ghế', value: `${hold.quantity} ghế` },
              { icon: '💰', label: 'Tổng giá trị', value: `${hold.totalPrice?.toLocaleString('vi-VN')}đ` },
              { icon: '👑', label: 'Host', value: hold.userId?.fullName || 'N/A' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.icon} {row.label}</span>
                <strong style={{ textAlign: 'right' }}>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px', padding: '1.5rem',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>👥 Thành viên trong nhóm</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {paidCount}/{totalCount} đã trả
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: '10px', background: 'var(--bg-input)', borderRadius: '5px', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{
              height: '100%', borderRadius: '5px',
              width: totalCount > 0 ? `${(paidCount / totalCount) * 100}%` : '0%',
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              transition: 'width 0.5s ease'
            }} />
          </div>

          {/* Members List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {hold.members?.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', borderRadius: '12px',
                background: m.isPaid ? 'rgba(34,197,94,0.08)' : 'var(--bg-input)',
                border: `1px solid ${m.isPaid ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: m.isPaid ? 'rgba(34,197,94,0.2)' : 'var(--bg-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                  }}>
                    {m.isPaid ? '✅' : '⏳'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.email}</div>
                    <div style={{ fontSize: '0.75rem', color: m.isPaid ? '#22c55e' : 'var(--text-muted)' }}>
                      {m.isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                    </div>
                  </div>
                </div>
                <strong style={{ color: 'var(--purple)', fontSize: '0.95rem' }}>
                  {m.amount?.toLocaleString('vi-VN')}đ
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Pay Button (for members who haven't paid) */}
          {!hold.isExpired && user && myMember && !alreadyPaid && (
            <button onClick={handlePay} disabled={paying} style={{
              padding: '1rem', borderRadius: '14px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem',
              boxShadow: '0 4px 16px rgba(34,197,94,0.3)', opacity: paying ? 0.7 : 1
            }}>
              {paying ? '⏳ Đang xử lý...' : `💳 Thanh toán ${myMember.amount?.toLocaleString('vi-VN')}đ`}
            </button>
          )}

          {/* Already paid */}
          {alreadyPaid && (
            <div style={{
              padding: '1rem', borderRadius: '14px', textAlign: 'center',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
              color: '#22c55e', fontWeight: 600
            }}>
              ✅ Bạn đã thanh toán phần của mình rồi!
            </div>
          )}

          {/* Not a member */}
          {user && !myMember && !isHost && (
            <div style={{
              padding: '1rem', borderRadius: '14px', textAlign: 'center',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '0.9rem'
            }}>
              ⚠️ Bạn không có trong danh sách nhóm mua này
            </div>
          )}

          {/* Not logged in */}
          {!user && (
            <Link to="/login" style={{
              display: 'block', padding: '1rem', borderRadius: '14px',
              background: 'var(--accent)', color: '#fff', fontWeight: 700,
              fontSize: '1rem', textAlign: 'center', textDecoration: 'none'
            }}>
              🔐 Đăng nhập để thanh toán
            </Link>
          )}

          {/* Share Button */}
          <button onClick={copyLink} style={{
            padding: '0.85rem', borderRadius: '14px', background: 'var(--bg-input)',
            border: '1px solid var(--border)', color: 'var(--text-primary)',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
          }}>
            📋 Sao chép link chia sẻ với bạn bè
          </button>
        </div>
      </div>
    </div>
  );
}
