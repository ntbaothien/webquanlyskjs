import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axiosInstance.put('/users/me', form);
      updateUser(data.data);
      setMsg({ type: 'success', text: 'Cập nhật thành công!' });
    } catch {
      setMsg({ type: 'error', text: 'Cập nhật thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = { Admin: 'badge-red', Organizer: 'badge-orange', User: 'badge-purple' };

  return (
    <div className="page">
      <div className="container page-content" style={{ maxWidth: 600 }}>
        <div className="card text-center mb-24" style={{ padding: '32px 24px' }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, margin: '0 auto 16px' }}>
            {user?.fullName?.[0] || 'U'}
          </div>
          <h2>{user?.fullName}</h2>
          <p style={{ marginTop: 4 }}>{user?.email}</p>
          <div className="mt-12">
            <span className={`badge ${roleBadge[user?.role] || 'badge-purple'}`}>{user?.role}</span>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-20">Chỉnh sửa hồ sơ</h3>
          {msg && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'} mb-16`}>{msg.text}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input className="form-input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : '💾 Lưu thay đổi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
