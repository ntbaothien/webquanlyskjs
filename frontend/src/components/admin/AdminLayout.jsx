import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/common/Navbar';
import '../../pages/admin/Admin.css';

export default function AdminLayout({ children, title, subtitle }) {
  const location = useLocation();
  const { t } = useTranslation();

  const sidebarItems = [
    { label: t('admin.sidebarSection'), isSection: true },
    { path: '/admin',            icon: '📊', label: t('admin.sidebarOverview'),   end: true },
    { path: '/admin/users',      icon: '👥', label: t('admin.sidebarUsers') },
    { path: '/admin/events',     icon: '🎪', label: t('admin.sidebarEvents') },
    { path: '/admin/coupons',    icon: '🎁', label: t('admin.sidebarCoupons') },
    { path: '/admin/reports',    icon: '📈', label: t('admin.sidebarReports') },
    { path: '/admin/violations', icon: '🚨', label: t('admin.sidebarViolations') },
    { path: '/admin/topups',     icon: '💳', label: t('admin.sidebarTopups') },
  ];

  return (
    <>
      <Navbar />
      <div className="admin-wrapper">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <h2>🛡️ Admin Panel</h2>
            <p>{t('admin.sidebarSub')}</p>
          </div>

          <nav>
            {sidebarItems.map((item, i) => {
              if (item.isSection) {
                return <div key={i} className="sidebar-section-label">{item.label}</div>;
              }
              const isActive = item.end
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  end={item.end}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="admin-content">
          {title && (
            <div className="admin-page-header">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </>
  );
}
