import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

const statusBadge = (s) => ({
  Pending: <span className="badge badge-orange">Chờ TT</span>,
  Paid: <span className="badge badge-green">Đã TT</span>,
  Cancelled: <span className="badge badge-red">Đã hủy</span>,
  Refunded: <span className="badge badge-blue">Hoàn tiền</span>,
}[s] || <span className="badge badge-purple">{s}</span>);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

export default function OrderListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    axiosInstance.get('/orders').then(({ data }) => {
      setOrders(data.data.items || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Bạn chắc chắn muốn hủy đơn này?')) return;
    try {
      await axiosInstance.put(`/orders/${id}/cancel`);
      setOrders(o => o.map(order => order._id === id ? { ...order, status: 'Cancelled' } : order));
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể hủy đơn hàng');
    }
  };

  if (loading) return <div className="loading-center" style={{ marginTop: 100 }}><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container page-content">
        <h2 className="mb-8">📦 Đơn hàng của tôi</h2>
        <p className="mb-32">{orders.length} đơn hàng</p>

        {orders.length === 0 ? (
          <div className="text-center" style={{ padding: '80px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>📭</div>
            <h3>Chưa có đơn hàng nào</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.map(order => (
              <div key={order._id} className="card">
                <div className="flex-between mb-12">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{order.eventId?.title || 'Sự kiện'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                      {formatDate(order.createdAt)} · {order.items?.length || 0} loại vé
                    </div>
                  </div>
                  {statusBadge(order.status)}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {order.items?.map((item, i) => (
                    <span key={i} className="badge badge-purple">
                      {item.quantity}x {item.ticketTypeId?.name || 'Vé'}
                    </span>
                  ))}
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    #{order._id.slice(-8).toUpperCase()}
                  </div>
                  <div className="flex gap-12" style={{ alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary-light)' }}>
                      {order.finalAmount?.toLocaleString('vi-VN')}đ
                    </span>
                    {order.status === 'Pending' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(order._id)}>
                        Hủy đơn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
