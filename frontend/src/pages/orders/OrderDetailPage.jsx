import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }) : '';
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
    if (!window.confirm(t('orderDetail.cancelConfirm'))) return;
    try {
      await axiosInstance.put(`/orders/${id}/cancel`);
      setOrder({ ...order, status: 'Cancelled' });
    } catch (err) {
      alert(err.response?.data?.error || t('orderDetail.cancelFailed'));
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
          {t('orderDetail.backToList')}
        </button>

        <div className="flex-between mb-24">
          <h2>{t('orderDetail.title')}</h2>
          <span className={`badge ${STATUS_COLORS[order.status] || 'badge-purple'} px-12 py-6`} style={{ fontSize: 13 }}>
            {order.status}
          </span>
        </div>

        <div className="card mb-24">
          <div className="grid-2 gap-24">
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{t('orderDetail.orderId')}</div>
              <div style={{ fontWeight: 700 }}>#{order._id.slice(-8).toUpperCase()}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{t('orderDetail.orderDate')}</div>
              <div style={{ fontWeight: 700 }}>{formatDate(order.createdAt)}</div>
            </div>
            {order.eventId && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>{t('orderDetail.event')}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{order.eventId.title}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-24">
          <h3 className="mb-16">{t('orderDetail.paymentDetails')}</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('orderDetail.ticketType')}</th>
                  <th style={{ textAlign: 'center' }}>{t('orderDetail.qty')}</th>
                  <th style={{ textAlign: 'right' }}>{t('orderDetail.unitPrice')}</th>
                  <th style={{ textAlign: 'right' }}>{t('orderDetail.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.ticketTypeId?.name || t('orderDetail.standard')}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{(item.unitPrice || 0).toLocaleString(locale)}đ</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{((item.quantity * item.unitPrice) || 0).toLocaleString(locale)}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card2)', borderRadius: 12 }}>
            <div className="flex-between mb-8">
              <span style={{ color: 'var(--text-muted)' }}>{t('orderDetail.subtotal')}</span>
              <span>{order.totalAmount?.toLocaleString(locale)}đ</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex-between mb-8" style={{ color: 'var(--success)' }}>
                <span>{t('orderDetail.discount')} {order.discountCode ? `(${order.discountCode})` : ''}</span>
                <span>-{order.discountAmount?.toLocaleString(locale)}đ</span>
              </div>
            )}
            <div className="flex-between pt-16 mt-8" style={{ borderTop: '1px solid var(--border)', fontSize: 18, fontWeight: 800 }}>
              <span>{t('orderDetail.total')}</span>
              <span style={{ color: 'var(--primary-light)' }}>{order.finalAmount?.toLocaleString(locale)}đ</span>
            </div>
          </div>
        </div>

        <div className="flex gap-16" style={{ justifyContent: 'flex-end' }}>
          {order.status === 'Paid' && (
            <button className="btn btn-secondary" onClick={() => window.open(`/api/orders/${order._id}/invoice`, '_blank')}>
              {t('orderDetail.exportInvoice')}
            </button>
          )}
          {order.status === 'Pending' && (
            <button className="btn btn-danger" onClick={handleCancel}>
              {t('orderDetail.cancelOrder')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
