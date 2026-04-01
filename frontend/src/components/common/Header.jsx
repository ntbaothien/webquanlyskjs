import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="header">
      {/* Logo */}
      <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
        <div className="logo-icon">🎟️</div>
        <span>EventHub</span>
      </Link>

      {/* Nav */}
      <nav className="nav-links">
        <Link to="/" className="nav-link">Sự kiện</Link>
        {user && <Link to="/my-tickets" className="nav-link">Vé của tôi</Link>}
        {user && <Link to="/orders" className="nav-link">Đơn hàng</Link>}
        {user?.role === 'Admin' && <Link to="/admin" className="nav-link">Admin</Link>}
        {user?.role === 'Organizer' && <Link to="/admin/events" className="nav-link">Quản lý</Link>}
      </nav>

      {/* Right */}
      <div className="flex gap-12" style={{ alignItems: 'center' }}>
        {user ? (
          <div style={{ position: 'relative' }}>
            <div
              className="avatar"
              style={{ cursor: 'pointer' }}
              onClick={() => setMenuOpen(!menuOpen)}
              title={user.fullName}
            >
              {user.avatar
                ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : initial
              }
            </div>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '48px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', minWidth: '180px', padding: '8px',
                boxShadow: 'var(--shadow)', zIndex: 200,
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{user.fullName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email}</div>
                </div>
                <button className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
                  onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
                  👤 Hồ sơ
                </button>
                <button className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
                  onClick={() => { navigate('/my-tickets'); setMenuOpen(false); }}>
                  🎫 Vé của tôi
                </button>
                <button className="btn btn-danger w-full" style={{ marginTop: '8px' }} onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-8">
            <Link to="/login" className="btn btn-secondary btn-sm">Đăng nhập</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
}
