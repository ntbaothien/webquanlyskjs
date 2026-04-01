import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function BookingPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    axiosInstance.get(`/events/${eventId}`)
      .then(({ data }) => {
        const ev = data.event;
        // Check if event has ended
        const eventEnd = ev.endDate || ev.startDate;
        if (eventEnd && new Date(eventEnd) < new Date()) {
          navigate(`/events/${eventId}`, { state: { error: 'Sự kiện đã kết thúc, không thể đặt vé' } });
          return;
        }
        setEvent(ev);
        setZones(ev.seatZones || []);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [eventId]);

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponInfo(null);
    setCouponDiscount(0);
    setCouponLoading(true);
    try {
      const { data } = await axiosInstance.post('/coupons/validate', {
        code: couponCode,
        orderAmount: totalPriceBeforeDiscount,
        eventId
      });
      setCouponDiscount(data.discount);
      setCouponInfo(data.coupon);
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Mã giảm giá không hợp lệ');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponInfo(null);
    setCouponError('');
  };

  const handleBook = async () => {
    if (!selectedZone) { setError('Vui lòng chọn khu vực'); return; }
    setError('');
    setSubmitting(true);
    try {
      await axiosInstance.post(`/events/${eventId}/book`, {
        zoneId: selectedZone._id || selectedZone.id,
        quantity
      });

      // Mark coupon as used
      if (couponInfo) {
        try { await axiosInstance.post('/coupons/use', { code: couponInfo.code }); } catch {}
      }

      navigate('/my-tickets', { state: { success: true, message: `Đặt ${quantity} vé khu ${selectedZone.name} thành công! 🎉` } });
    } catch (err) {
      setError(err.response?.data?.error || 'Đặt vé thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <><Navbar /><div className="loading-state">⏳ Đang tải...</div></>;
  if (!event) return null;

  const totalPriceBeforeDiscount = selectedZone ? selectedZone.price * quantity : 0;
  const finalPrice = Math.max(0, totalPriceBeforeDiscount - couponDiscount);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <button className="btn-back" onClick={() => navigate(`/events/${eventId}`)}>← Quay lại</button>
        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>🪑 Chọn chỗ ngồi</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>{event.title}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
          {/* Left - Zone selection */}
          <div>
            <h3 style={{ marginBottom: '1rem' }}>1. Chọn khu vực</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {zones.map(zone => {
                const available = Math.max(0, zone.totalSeats - zone.soldSeats);
                const isSoldOut = available === 0;
                const zoneId = zone._id || zone.id;
                const isSelected = selectedZone && (selectedZone._id || selectedZone.id) === zoneId;
                return (
                  <div
                    key={zoneId}
                    onClick={() => { if (!isSoldOut) { setSelectedZone(zone); setError(''); removeCoupon(); } }}
                    style={{
                      background: isSelected ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${isSelected ? zone.color || '#6c63ff' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '14px',
                      padding: '1.25rem 1.5rem',
                      cursor: isSoldOut ? 'not-allowed' : 'pointer',
                      opacity: isSoldOut ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                          <span style={{
                            display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                            background: zone.color || '#6c63ff', flexShrink: 0
                          }} />
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{zone.name}</span>
                          {isSoldOut && <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '20px' }}>Hết chỗ</span>}
                        </div>
                        {zone.description && (
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem' }}>{zone.description}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${zone.totalSeats > 0 ? (zone.soldSeats / zone.totalSeats) * 100 : 0}%`,
                              background: zone.color || '#6c63ff',
                              borderRadius: 3,
                              transition: 'width 0.4s'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: available <= 5 ? '#fca5a5' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                            {available <= 5 && available > 0 ? `⚡ Còn ${available}!` : `${available} / ${zone.totalSeats}`}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '1.5rem' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: zone.color || '#a78bfa' }}>
                          {zone.price === 0 ? 'Miễn phí' : `${zone.price.toLocaleString('vi-VN')}đ`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>/ ghế</div>
                        {isSelected && <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>✅</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quantity */}
            {selectedZone && (
              <div style={{
                marginTop: '1.5rem',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <h3 style={{ marginBottom: '1rem' }}>2. Số lượng vé</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <button
                    onClick={() => { setQuantity(q => Math.max(1, q - 1)); removeCoupon(); }}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <span style={{ fontSize: '2rem', fontWeight: 800, minWidth: 48, textAlign: 'center', color: '#fff' }}>{quantity}</span>
                  <button
                    onClick={() => {
                      const max = Math.max(0, selectedZone.totalSeats - selectedZone.soldSeats);
                      setQuantity(q => Math.min(max, q + 1));
                      removeCoupon();
                    }}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
                    (Còn {Math.max(0, selectedZone.totalSeats - selectedZone.soldSeats)} ghế)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right - Summary */}
          <div>
            <div style={{
              position: 'sticky',
              top: 'calc(var(--header-h, 70px) + 20px)',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{ marginBottom: '1.25rem', color: '#fff' }}>📋 Tóm tắt</h3>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Sự kiện:</p>
                <p style={{ fontWeight: 600, color: '#fff' }}>{event.title}</p>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                  📅 {new Date(event.startDate).toLocaleDateString('vi-VN')}
                </p>
              </div>

              {selectedZone ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Khu vực:</span>
                      <span style={{ color: selectedZone.color || '#a78bfa', fontWeight: 600 }}>{selectedZone.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Đơn giá:</span>
                      <span style={{ color: '#fff' }}>{selectedZone.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Số lượng:</span>
                      <span style={{ color: '#fff' }}>× {quantity}</span>
                    </div>
                  </div>

                  {/* 🎁 COUPON SECTION */}
                  <div className="coupon-section">
                    <h4 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>🎁 Mã giảm giá</h4>
                    {!couponInfo ? (
                      <>
                        <div className="coupon-input-wrap">
                          <input
                            className="coupon-input"
                            placeholder="Nhập mã coupon"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          />
                          <button className="coupon-apply-btn" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                            {couponLoading ? '⏳' : 'Áp dụng'}
                          </button>
                        </div>
                        {couponError && <div className="coupon-error">❌ {couponError}</div>}
                      </>
                    ) : (
                      <div className="coupon-success">
                        <span>✅ {couponInfo.code} — Giảm {couponDiscount.toLocaleString('vi-VN')}đ</span>
                        <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Price breakdown */}
                  <div style={{ padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '1rem' }}>
                    {couponDiscount > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Tạm tính:</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{totalPriceBeforeDiscount.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ color: '#86efac', fontSize: '0.9rem' }}>Giảm giá:</span>
                          <span style={{ color: '#86efac' }}>-{couponDiscount.toLocaleString('vi-VN')}đ</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Tổng tiền:</span>
                      <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#a78bfa' }}>
                        {finalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>

                  {error && <div className="msg-box error" style={{ marginBottom: '1rem' }}>{error}</div>}

                  <button
                    onClick={handleBook}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '0.9rem', borderRadius: '10px',
                      background: submitting ? 'rgba(108,99,255,0.5)' : 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                      color: '#fff', border: 'none', fontWeight: 700, fontSize: '1rem',
                      cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {submitting ? '⏳ Đang xử lý...' : '💳 Xác nhận đặt vé'}
                  </button>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '0.75rem' }}>
                    Thanh toán mô phỏng — số dư sẽ bị trừ tự động
                  </p>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.4)' }}>
                  👆 Chọn khu vực bên trái để tiếp tục
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
