import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import AdminLayout from '../../components/admin/AdminLayout';
import './Admin.css';

export default function CouponManagePage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'PERCENT', discountValue: 10,
    maxUses: 0, minOrderAmount: 0, maxDiscount: 0, validTo: ''
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/coupons');
      setCoupons(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/coupons', form);
      showMsg('Tạo coupon thành công!');
      setShowForm(false);
      setForm({ code: '', description: '', discountType: 'PERCENT', discountValue: 10, maxUses: 0, minOrderAmount: 0, maxDiscount: 0, validTo: '' });
      fetchCoupons();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Tạo thất bại', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa coupon này?')) return;
    try {
      await axiosInstance.delete(`/coupons/${id}`);
      showMsg('Đã xóa coupon');
      fetchCoupons();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Xóa thất bại', 'error');
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await axiosInstance.put(`/coupons/${coupon._id || coupon.id}`, { isActive: !coupon.isActive });
      fetchCoupons();
    } catch {}
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const isExpired = (d) => d && new Date(d) < new Date();

  return (
    <AdminLayout title="🎁 Quản lý Coupon" subtitle={`${coupons.length} mã giảm giá`}>
      {msg.text && <div className={`admin-msg ${msg.type}`}>{msg.type === 'success' ? '✅' : '❌'} {msg.text}</div>}

      <div style={{ marginBottom: '1.5rem' }}>
        <button className="admin-btn admin-btn-success" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Đóng' : '➕ Tạo Coupon mới'}
        </button>
      </div>

      {showForm && (
        <div className="admin-chart-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Tạo mã giảm giá</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="admin-form-label">Mã code *</label>
              <input className="admin-search-input" placeholder="VD: SALE2026" required
                value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="admin-form-label">Mô tả</label>
              <input className="admin-search-input" placeholder="Giảm giá mùa hè"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="admin-form-label">Loại giảm</label>
              <select className="admin-filter-select" value={form.discountType}
                onChange={e => setForm({ ...form, discountType: e.target.value })}>
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (VNĐ)</option>
              </select>
            </div>
            <div>
              <label className="admin-form-label">Giá trị giảm *</label>
              <input className="admin-search-input" type="number" required min="1"
                value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} />
            </div>
            <div>
              <label className="admin-form-label">Số lượt dùng tối đa (0 = không giới hạn)</label>
              <input className="admin-search-input" type="number" min="0"
                value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} />
            </div>
            <div>
              <label className="admin-form-label">Đơn tối thiểu (VNĐ)</label>
              <input className="admin-search-input" type="number" min="0"
                value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} />
            </div>
            <div>
              <label className="admin-form-label">Giảm tối đa (VNĐ, 0 = không giới hạn)</label>
              <input className="admin-search-input" type="number" min="0"
                value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })} />
            </div>
            <div>
              <label className="admin-form-label">Hạn sử dụng *</label>
              <input className="admin-search-input" type="date" required
                value={form.validTo} onChange={e => setForm({ ...form, validTo: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="admin-btn admin-btn-success">✅ Tạo Coupon</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">⏳ Đang tải...</div>
      ) : coupons.length === 0 ? (
        <div className="admin-empty-state">🎫 Chưa có coupon nào</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Giảm</th>
                <th>Đã dùng</th>
                <th>Đơn tối thiểu</th>
                <th>Hạn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c._id || c.id}>
                  <td>
                    <code style={{ background: 'rgba(167,139,250,0.15)', padding: '4px 10px', borderRadius: '6px', color: '#a78bfa', fontWeight: 700, fontSize: '0.95rem' }}>
                      {c.code}
                    </code>
                    {c.description && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{c.description}</div>}
                  </td>
                  <td style={{ color: '#86efac', fontWeight: 700 }}>
                    {c.discountType === 'PERCENT' ? `${c.discountValue}%` : `${c.discountValue?.toLocaleString('vi-VN')}đ`}
                  </td>
                  <td>
                    {c.usedCount} / {c.maxUses || '∞'}
                  </td>
                  <td>{c.minOrderAmount > 0 ? `${c.minOrderAmount.toLocaleString('vi-VN')}đ` : '—'}</td>
                  <td style={{ color: isExpired(c.validTo) ? '#fca5a5' : 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    {formatDate(c.validTo)}
                    {isExpired(c.validTo) && <span style={{ marginLeft: '4px' }}>⏰</span>}
                  </td>
                  <td>
                    <button onClick={() => toggleActive(c)} className={`admin-btn ${c.isActive ? 'admin-btn-success' : 'admin-btn-danger'}`}
                      style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                      {c.isActive ? '✅ Active' : '🚫 Inactive'}
                    </button>
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-danger" onClick={() => handleDelete(c._id || c.id)}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
