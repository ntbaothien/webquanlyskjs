import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

export default function CheckoutPage() {
  const { eventId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [selected, setSelected] = useState(state?.ticketType || null);
  const [qty, setQty] = useState(1);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=select, 2=payment

  useEffect(() => {
    Promise.all([
      axiosInstance.get(`/events/${eventId}`),
      axiosInstance.get(`/events/${eventId}/ticket-types`),
    ]).then(([ev, tt]) => {
      setEvent(ev.data.data);
      setTicketTypes(tt.data.data);
    }).catch(() => navigate('/'));
  }, [eventId]);

  const validateDiscount = async () => {
    if (!discountCode) return;
    setDiscountError('');
    try {
      const total = selected ? selected.price * qty : 0;
      const { data } = await axiosInstance.post('/discounts/validate', { code: discountCode, eventId, totalAmount: total });
      setDiscount(data.data);
    } catch (err) {
      setDiscountError(err.response?.data?.error || 'Mã không hợp lệ');
      setDiscount(null);
    }
  };

  const handleOrder = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data: orderData } = await axiosInstance.post('/orders', {
        eventId,
        items: [{ ticketTypeId: selected._id, quantity: qty }],
        discountCode: discount ? discountCode : undefined,
      });
      const orderId = orderData.data._id;
      // Mô phỏng thanh toán
      await axiosInstance.post('/payments/checkout', { orderId, method: 'Cash' });
      // Webhook tự xử lý (demo)
      const payRes = await axiosInstance.get(`/payments/${orderId}`);
      if (payRes.data.data) {
        await axiosInstance.post('/payments/webhook', {
          paymentId: payRes.data.data._id, status: 'success',
          transactionId: `DEMO_${Date.now()}`,
        });
      }
      navigate('/my-tickets', { state: { success: true } });
    } catch (err) {
      alert(err.response?.data?.error || 'Đặt vé thất bại');
    } finally {
      setLoading(false);
    }
  };

  const total = selected ? selected.price * qty : 0;
  const finalAmount = discount ? Math.max(0, total - discount.discountAmount) : total;

  return (
    <div className="page">
      <div className="container page-content" style={{ maxWidth: 800 }}>
        <h2 className="mb-8">🛒 Thanh toán</h2>
        {event && <p className="mb-32">{event.title}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Left - Ticket Select */}
          <div>
            <div className="card mb-20">
              <h3 className="mb-16">1. Chọn loại vé</h3>
              {ticketTypes.map(tt => (
                <div key={tt._id}
                  className="card mb-10"
                  style={{ cursor: 'pointer', borderColor: selected?._id === tt._id ? 'var(--primary)' : 'var(--border)', padding: '14px 16px', background: selected?._id === tt._id ? 'rgba(108,99,255,0.1)' : 'var(--bg-card2)' }}
                  onClick={() => { setSelected(tt); setDiscount(null); }}>
                  <div className="flex-between">
                    <div>
                      <div style={{ fontWeight: 700 }}>{tt.name}</div>
                      {tt.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tt.description}</div>}
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Còn {tt.quantity - tt.sold} vé</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary-light)', fontSize: 16 }}>
                        {tt.price === 0 ? 'Miễn phí' : `${tt.price.toLocaleString('vi-VN')}đ`}
                      </div>
                      {selected?._id === tt._id && <span style={{ fontSize: 18, color: 'var(--primary)' }}>✓</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selected && (
              <div className="card mb-20">
                <h3 className="mb-16">2. Số lượng</h3>
                <div className="flex" style={{ alignItems: 'center', gap: 16 }}>
                  <button className="btn btn-secondary btn-icon" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <span style={{ fontSize: 24, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{qty}</span>
                  <button className="btn btn-secondary btn-icon" onClick={() => setQty(q => Math.min(selected.quantity - selected.sold, q + 1))}>+</button>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {selected.quantity - selected.sold} vé</span>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="mb-16">3. Mã giảm giá</h3>
              <div className="flex gap-12">
                <input className="form-input" placeholder="Nhập mã giảm giá..."
                  value={discountCode} onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscount(null); }} />
                <button className="btn btn-secondary" onClick={validateDiscount}>Áp dụng</button>
              </div>
              {discountError && <div className="form-error mt-8">{discountError}</div>}
              {discount && (
                <div className="alert alert-success mt-12">
                  ✅ Giảm {discount.discountAmount.toLocaleString('vi-VN')}đ với mã {discount.code}
                </div>
              )}
            </div>
          </div>

          {/* Right Summary */}
          <div>
            <div className="card-glass" style={{ padding: 24, position: 'sticky', top: 'calc(var(--header-h) + 20px)' }}>
              <h3 className="mb-16">Tóm tắt đơn</h3>
              {selected ? (
                <>
                  <div style={{ fontSize: 14, borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                    <div className="flex-between mb-8"><span style={{ color: 'var(--text-muted)' }}>{selected.name}</span><span>{selected.price.toLocaleString('vi-VN')}đ</span></div>
                    <div className="flex-between mb-8"><span style={{ color: 'var(--text-muted)' }}>Số lượng</span><span>×{qty}</span></div>
                    <div className="flex-between"><span style={{ color: 'var(--text-muted)' }}>Tạm tính</span><span>{total.toLocaleString('vi-VN')}đ</span></div>
                    {discount && <div className="flex-between mt-8" style={{ color: 'var(--success)' }}><span>Giảm giá</span><span>−{discount.discountAmount.toLocaleString('vi-VN')}đ</span></div>}
                  </div>
                  <div className="flex-between" style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
                    <span>Tổng cộng</span>
                    <span style={{ color: 'var(--primary-light)' }}>{finalAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <button className="btn btn-primary btn-lg w-full" onClick={handleOrder} disabled={loading}>
                    {loading ? <span className="spinner spinner-sm" /> : '💳 Xác nhận đặt vé'}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
                    Bằng cách đặt vé, bạn đồng ý với điều khoản sử dụng
                  </p>
                </>
              ) : (
                <div className="text-center" style={{ padding: 24, color: 'var(--text-muted)' }}>
                  Vui lòng chọn loại vé
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
