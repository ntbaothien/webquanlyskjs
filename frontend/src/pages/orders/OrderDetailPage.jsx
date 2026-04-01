import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { 
  year: 'numeric', month: '2-digit', day: '2-digit', 
  hour: '2-digit', minute: '2-digit' 
}) : '';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await axiosInstance.get(`/orders/${id}`);
        setOrder(data.data);
      } catch (err) {
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  const handleCancel = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    try {
      await axiosInstance.put(`/orders/${id}/cancel`);
      setOrder({ ...order, status: 'Cancelled' });
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể hủy đơn');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!order) return null;

  const STATUS_COLORS = {
    'Pending': 'badge-orange',
    'Paid': 'badge-green',
    'Cancelled': 'badge-red',
    'Refunded': 'badge-blue'
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <button className="btn btn-ghost mb-24" onClick={() => navigate('/orders')}>
          ← Quay lại danh sách
        </button>

        <div className="flex-between mb-24">
          <h2>Chi tiết đơn hàng</h2>
          <span className={`badge ${STATUS_COLORS[order.status] || 'badge-purple'} px-12 py-6`} style={{ fontSize: 13 }}>
            {order.status}
          </span>
        </div>

        <div className="card mb-24">
          <div className="grid-2 gap-24">
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>Mã đơn hàng</div>
              <div style={{ fontWeight: 700 }}>#{order._id.slice(-8).toUpperCase()}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>Ngày đặt</div>
              <div style={{ fontWeight: 700 }}>{formatDate(order.createdAt)}</div>
            </div>
            {order.eventId && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>Sự kiện</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{order.eventId.title}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-24">
          <h3 className="mb-16">Chi tiết thanh toán</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Loại vé</th>
                  <th style={{ textAlign: 'center' }}>Số lượng</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.ticketTypeId?.name || 'Vé tiêu chuẩn'}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{(item.unitPrice || 0).toLocaleString()}đ</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{((item.quantity * item.unitPrice) || 0).toLocaleString()}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card2)', borderRadius: 12 }}>
            <div className="flex-between mb-8">
              <span style={{ color: 'var(--text-muted)' }}>Tạm tính</span>
              <span>{order.totalAmount?.toLocaleString()}đ</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex-between mb-8" style={{ color: 'var(--success)' }}>
                <span>Giảm giá {order.discountCode ? `(${order.discountCode})` : ''}</span>
                <span>-{order.discountAmount?.toLocaleString()}đ</span>
              </div>
            )}
            <div className="flex-between pt-16 mt-8" style={{ borderTop: '1px solid var(--border)', fontSize: 18, fontWeight: 800 }}>
              <span>Tổng cộng</span>
              <span style={{ color: 'var(--primary-light)' }}>{order.finalAmount?.toLocaleString()}đ</span>
            </div>
          </div>
        </div>

        <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
          {order.status === 'Paid' && (
            <button className="btn btn-secondary" onClick={() => window.open(`/api/orders/${order._id}/invoice`, '_blank')}>
              📄 Xuất hóa đơn
            </button>
          )}
          {order.status === 'Pending' && (
            <button className="btn btn-danger" onClick={handleCancel}>
              ❌ Hủy đơn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
