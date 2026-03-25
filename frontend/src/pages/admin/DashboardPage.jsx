import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

const MENU = [
  { path: '/admin', icon: '📊', label: 'Dashboard' },
  { path: '/admin/users', icon: '👥', label: 'Người dùng' },
  { path: '/admin/events', icon: '🎪', label: 'Sự kiện' },
];

function AdminLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <header className="header">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <div className="logo-icon">🎟️</div>
          <span>EventHub <span className="badge badge-red" style={{ fontSize: 10, marginLeft: 6 }}>Admin</span></span>
        </Link>
        <div className="flex gap-12" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.fullName}</span>
          <button className="btn btn-danger btn-sm" onClick={() => { logout(); navigate('/login'); }}>Đăng xuất</button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-label">Quản lý chính</div>
        {MENU.map(item => (
          <div key={item.path} className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}>
            <span>{item.icon}</span><span>{item.label}</span>
          </div>
        ))}
        <div className="sidebar-label" style={{ marginTop: 8 }}>Nhanh</div>
        <div className="sidebar-item" onClick={() => navigate('/')}><span>🌐</span><span>Xem trang chủ</span></div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosInstance.get('/admin/dashboard'),
      axiosInstance.get('/admin/revenue?groupBy=day'),
    ]).then(([s, r]) => {
      setStats(s.data.data);
      setRevenue(r.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { icon: '👥', label: 'Người dùng', value: stats.totalUsers?.toLocaleString() || 0, color: 'var(--primary)' },
    { icon: '🎪', label: 'Sự kiện', value: stats.totalEvents?.toLocaleString() || 0, color: 'var(--secondary)' },
    { icon: '📦', label: 'Đơn đã TT', value: stats.totalOrders?.toLocaleString() || 0, color: 'var(--success)' },
    { icon: '💰', label: 'Doanh thu', value: `${(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ`, color: 'var(--warning)' },
    { icon: '🎫', label: 'Vé đã bán', value: stats.totalTickets?.toLocaleString() || 0, color: 'var(--info)' },
  ] : [];

  return (
    <AdminLayout>
      <h2 className="mb-8">📊 Dashboard</h2>
      <p className="mb-32">Tổng quan hệ thống EventHub</p>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', marginBottom: 32 }}>
            {statCards.map((s, i) => (
              <div key={i} className="stat-card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                  <div style={{ fontSize: '2rem', color: s.color }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Table */}
          <div className="card">
            <h3 className="mb-16">📈 Doanh thu gần đây</h3>
            {revenue.length === 0 ? (
              <p>Chưa có dữ liệu doanh thu</p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Ngày</th><th>Số giao dịch</th><th>Doanh thu</th></tr>
                  </thead>
                  <tbody>
                    {revenue.slice(-10).reverse().map(r => (
                      <tr key={r._id}>
                        <td>{r._id}</td>
                        <td>{r.count}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>{r.revenue?.toLocaleString('vi-VN')}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export { AdminLayout };
