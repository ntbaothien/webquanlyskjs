import { useState, useEffect } from 'react';
import { AdminLayout } from './DashboardPage';
import axiosInstance from '../../utils/axiosInstance';

const ROLES = ['User', 'Organizer', 'Admin'];

export default function UserManagePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/admin/users', { params: { search, limit: 20 } });
      setUsers(data.data.items || []);
      setTotal(data.data.pagination?.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => {
    const t = setTimeout(fetchUsers, 500);
    return () => clearTimeout(t);
  }, [search]);

  const changeRole = async (userId, role) => {
    try {
      await axiosInstance.patch(`/admin/users/${userId}/role`, { role });
      setUsers(u => u.map(user => user._id === userId ? { ...user, role } : user));
    } catch (err) { alert(err.response?.data?.error || 'Lỗi'); }
  };

  const deactivate = async (userId) => {
    if (!confirm('Vô hiệu hóa người dùng này?')) return;
    await axiosInstance.delete(`/admin/users/${userId}`);
    setUsers(u => u.map(user => user._id === userId ? { ...user, isActive: false } : user));
  };

  const roleBadge = { Admin: 'badge-red', Organizer: 'badge-orange', User: 'badge-purple' };

  return (
    <AdminLayout>
      <div className="flex-between mb-24">
        <div>
          <h2 className="mb-4">👥 Quản lý người dùng</h2>
          <p>{total} người dùng</p>
        </div>
      </div>

      <div className="search-bar mb-20" style={{ maxWidth: 380 }}>
        <span className="search-icon">🔍</span>
        <input className="form-input" placeholder="Tìm theo tên / email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Người dùng</th><th>Email</th><th>Role</th><th>Trạng thái</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : users.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="flex gap-10" style={{ alignItems: 'center' }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{user.fullName?.[0]}</div>
                    <span style={{ fontWeight: 600 }}>{user.fullName}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                <td>
                  <select className="form-input" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                    value={user.role} onChange={e => changeRole(user._id, e.target.value)}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td>{user.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}</td>
                <td>
                  {user.isActive && (
                    <button className="btn btn-danger btn-sm" onClick={() => deactivate(user._id)}>Vô hiệu hóa</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
