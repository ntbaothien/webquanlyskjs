import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

// Hook đếm ngược tới expiresAt
function useHoldCountdown(expiresAt) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) { setSecondsLeft(null); return; }
    const tick = () => {
      const diff = Math.floor((new Date(expiresAt) - new Date()) / 1000);
      setSecondsLeft(Math.max(0, diff));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return secondsLeft;
}

export default function BookingPage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const [event, setEvent] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Seat Hold state
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);  // thời điểm hết hạn
  const [holdLoading, setHoldLoading] = useState(false);     // đang gọi API hold
  const [holdError, setHoldError] = useState('');             // lỗi hold
  const [holdExpiredAlert, setHoldExpiredAlert] = useState(false); // hiện thị cảnh báo
  const prevSecondsRef = useRef(null);

  // Đếm ngược số giây
  const secondsLeft = useHoldCountdown(holdExpiresAt);

  // Khi countdown về 0 → hiện thị cảnh báo, reset zone
  useEffect(() => {
    if (secondsLeft === null) return;
    if (prevSecondsRef.current !== null && prevSecondsRef.current > 0 && secondsLeft === 0) {
      setHoldExpiredAlert(true);
      setSelectedZone(null);
      setHoldExpiresAt(null);
    }
    prevSecondsRef.current = secondsLeft;
  }, [secondsLeft]);

  const formatCountdown = (secs) => {
    if (secs === null || secs === undefined) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isHoldValid = holdExpiresAt && secondsLeft !== null && secondsLeft > 0;

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

  // Coupon state (phải có sau khi có zone)
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Gọi API giữ chỗ khi user chọn zone
  const handleSelectZone = async (zone) => {
    if (selectedZone && (selectedZone._id || selectedZone.id) === (zone._id || zone.id)) return; // đã chọn rồi
    setSelectedZone(zone);
    setQuantity(1);
    removeCoupon();
    setError('');
    setHoldError('');
    setHoldExpiredAlert(false);
    setHoldExpiresAt(null);
    setHoldLoading(true);
    try {
      const zoneId = zone._id || zone.id;
      const { data } = await axiosInstance.post(`/events/${eventId}/hold`, { zoneId, quantity: 1 });
      setHoldExpiresAt(data.expiresAt);
    } catch (err) {
      setHoldError(err.response?.data?.error || 'Không thể giữ chỗ lúc này');
      setSelectedZone(null);
    } finally {
      setHoldLoading(false);
    }
  };

  // Cập nhật hold khi đổi quantity
  const updateHold = async (newQty) => {
    if (!selectedZone || !isHoldValid) return;
    const zoneId = selectedZone._id || selectedZone.id;
    setHoldLoading(true);
    setHoldError('');
    try {
      const { data } = await axiosInstance.post(`/events/${eventId}/hold`, { zoneId, quantity: newQty });
      setHoldExpiresAt(data.expiresAt); // gia hạn countdown
    } catch (err) {
      setHoldError(err.response?.data?.error || 'Không thể cập nhật giữ chỗ');
    } finally {
      setHoldLoading(false);
    }
  };

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
    if (!selectedZone) { setError(t('booking.selectZoneError')); return; }
    if (!isHoldValid) {
      setHoldExpiredAlert(true);
      setSelectedZone(null);
      setHoldExpiresAt(null);
      return;
    }
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
      const errData = err.response?.data;
      if (errData?.holdExpired) {
        setHoldExpiredAlert(true);
        setSelectedZone(null);
        setHoldExpiresAt(null);
        setError('');
      } else if (errData?.soldOut) {
        setError(errData.error || 'Hết ghế, vui lòng chọn khu vực khác');
        setSelectedZone(null);
        setHoldExpiresAt(null);
        // Reload zones
        axiosInstance.get(`/events/${eventId}`).then(({ data }) => setZones(data.event?.seatZones || []));
      } else {
        setError(errData?.error || t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <><Navbar /><div className="loading-state">{t('booking.loading')}</div></>
  if (!event) return null;

  const totalPriceBeforeDiscount = selectedZone ? selectedZone.price * quantity : 0;
  const finalPrice = Math.max(0, totalPriceBeforeDiscount - couponDiscount);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <button className="btn-back" onClick={() => navigate(`/events/${eventId}`)}>{t('booking.back')}</button>
        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>🪑 {t('booking.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{event.title}</p>

        {/* Hold Expired Alert */}
        {holdExpiredAlert && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5'
          }}>
            <span style={{ fontSize: '1.4rem' }}>⏰</span>
            <div>
              <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Đã hết thời gian giữ chỗ!</strong>
              <span style={{ fontSize: '0.88rem', opacity: 0.85 }}>Vui lòng chọn lại khu vực ghế để tiếp tục đặt vé.</span>
            </div>
            <button
              onClick={() => setHoldExpiredAlert(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', fontSize: '1.2rem', cursor: 'pointer' }}
            >✕</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
          {/* Left - Zone selection */}
          <div>
            <h3 style={{ marginBottom: '1rem' }}>{t('booking.selectZone')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {zones.map(zone => {
                const available = Math.max(0, zone.totalSeats - zone.soldSeats);
                const isSoldOut = available === 0;
                const zoneId = zone._id || zone.id;
                const isSelected = selectedZone && (selectedZone._id || selectedZone.id) === zoneId;
                return (
                  <div
                    key={zoneId}
                    onClick={() => { if (!isSoldOut && !holdLoading) handleSelectZone(zone); }}
                    style={{
                      background: isSelected ? 'rgba(108,99,255,0.15)' : 'var(--bg-input)',
                      border: `2px solid ${isSelected ? zone.color || '#6c63ff' : 'var(--border)'}`,
                      boxShadow: isSelected ? `0 2px 12px rgba(108,99,255,0.15)` : '0 1px 4px rgba(0,0,0,0.06)',
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
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{zone.name}</span>
                          {isSoldOut && <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '20px' }}>{t('booking.soldOut')}</span>}
                        </div>
                        {zone.description && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{zone.description}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${zone.totalSeats > 0 ? (zone.soldSeats / zone.totalSeats) * 100 : 0}%`,
                              background: zone.color || '#6c63ff',
                              borderRadius: 3,
                              transition: 'width 0.4s'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: available <= 5 ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {available <= 5 && available > 0 ? `⚡ ${available}!` : `${available} / ${zone.totalSeats}`}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '1.5rem' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: zone.color || '#a78bfa' }}>
                          {zone.price === 0 ? t('eventDetail.free') : `${zone.price.toLocaleString(locale)}đ`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t('booking.perSeat')}</div>
                        {isSelected && <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>✅</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Seat Hold Countdown */}
            {holdLoading && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(108,99,255,0.1)', borderRadius: '10px', color: '#a78bfa', fontSize: '0.88rem' }}>
                ⏳ Đang giữ chỗ cho bạn...
              </div>
            )}

            {holdError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.88rem' }}>
                ❌ {holdError}
              </div>
            )}

            {/* Quantity */}
            {selectedZone && isHoldValid && (
              <div style={{
                marginTop: '1.5rem',
                background: 'var(--bg-input)',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                border: '1px solid var(--border)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
              }}>
                <h3 style={{ marginBottom: '1rem' }}>{t('booking.selectQuantity')}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <button
                    onClick={() => {
                      const newQty = Math.max(1, quantity - 1);
                      setQuantity(newQty);
                      removeCoupon();
                      if (newQty !== quantity) updateHold(newQty);
                    }}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <span style={{ fontSize: '2rem', fontWeight: 800, minWidth: 48, textAlign: 'center', color: 'var(--text-primary)' }}>{quantity}</span>
                  <button
                    onClick={() => {
                      const max = Math.max(0, selectedZone.totalSeats - selectedZone.soldSeats);
                      const newQty = Math.min(max, quantity + 1);
                      setQuantity(newQty);
                      removeCoupon();
                      if (newQty !== quantity) updateHold(newQty);
                    }}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-strong)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {t('booking.seatsLeft', { count: Math.max(0, selectedZone.totalSeats - selectedZone.soldSeats) })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right - Summary */}
          <div>
            <div className="booking-summary-card" style={{
              position: 'sticky',
              top: 'calc(var(--header-h, 70px) + 20px)',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)'
            }}>
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>{t('booking.summary')}</h3>

              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('booking.event')}</p>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  📅 {new Date(event.startDate).toLocaleDateString(locale)}
                </p>
              </div>

              {/* Seat Hold Countdown Badge */}
              {isHoldValid && (
                <div style={{
                  background: secondsLeft <= 60 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                  border: `1px solid ${secondsLeft <= 60 ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
                  borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: secondsLeft <= 60 ? '#fca5a5' : '#6ee7b7', marginBottom: '0.2rem' }}>
                      ⏳ Thời gian giữ chỗ
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: secondsLeft <= 60 ? '#ef4444' : '#10b981', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
                      {formatCountdown(secondsLeft)}
                    </div>
                  </div>
                  {secondsLeft <= 60 && (
                    <div style={{ fontSize: '0.76rem', color: '#fca5a5', textAlign: 'right', maxWidth: 100 }}>
                      Sắp hết!<br/>Hãy xác nhận nhanh
                    </div>
                  )}
                </div>
              )}

              {selectedZone ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('booking.zone')}</span>
                      <span style={{ color: selectedZone.color || 'var(--purple)', fontWeight: 600 }}>{selectedZone.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('booking.unitPrice')}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedZone.price.toLocaleString(locale)}đ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('booking.quantity')}</span>
                      <span style={{ color: 'var(--text-primary)' }}>× {quantity}</span>
                    </div>
                  </div>

                  {/* 🎁 COUPON SECTION */}
                  <div className="coupon-section">
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('booking.couponTitle')}</h4>
                    {!couponInfo ? (
                      <>
                        <div className="coupon-input-wrap">
                          <input
                            className="coupon-input"
                            placeholder={t('booking.couponPlaceholder')}
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          />
                          <button className="coupon-apply-btn" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                            {couponLoading ? '⏳' : t('booking.apply')}
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
                  <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
                    {couponDiscount > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('booking.subtotal')}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{totalPriceBeforeDiscount.toLocaleString(locale)}đ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{t('booking.discount')}</span>
                          <span style={{ color: 'var(--success)' }}>-{couponDiscount.toLocaleString(locale)}đ</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{t('booking.total')}</span>
                      <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--purple)' }}>
                        {finalPrice.toLocaleString(locale)}đ
                      </span>
                    </div>
                  </div>

                  {error && <div className="msg-box error" style={{ marginBottom: '1rem' }}>{error}</div>}

                  <button
                    onClick={handleBook}
                    disabled={submitting || !isHoldValid}
                    style={{
                      width: '100%', padding: '0.9rem', borderRadius: '10px',
                      background: submitting || !isHoldValid
                        ? 'rgba(108,99,255,0.35)'
                        : 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                      color: '#fff', border: 'none', fontWeight: 700, fontSize: '1rem',
                      cursor: submitting || !isHoldValid ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {submitting ? t('booking.processing') : !isHoldValid ? '⏰ Giữ chỗ đã hết hạn' : t('booking.confirmBook')}
                  </button>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
                    {t('booking.paymentNote')}
                  </p>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  {t('booking.selectZonePrompt')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
