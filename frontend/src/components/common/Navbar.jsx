import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import axiosInstance from '../../utils/axiosInstance';
import NotificationBell from './NotificationBell';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">🎪 EventHub</Link>

        {/* Theme + Lang Controls */}
        <div className="navbar-controls">
          <button
            className="btn-theme"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="btn-lang"
            onClick={toggleLang}
            title="Switch language"
          >
            <span className="lang-flag">{i18n.language === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
            {i18n.language === 'vi' ? 'VI' : 'EN'}
          </button>
        </div>

        <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu">
          <span className={`hamburger ${menuOpen ? 'open' : ''}`}>
            <span></span><span></span><span></span>
          </span>
        </button>

        <div className={`navbar-menu ${menuOpen ? 'show' : ''}`}>
          <div className="navbar-links">
            <Link to="/" className={isActive('/')} onClick={() => setMenuOpen(false)}>
              {t('nav.events')}
            </Link>
            {user && (
              <>
                {user.role === 'ATTENDEE' && (
                  <Link to="/my-registrations" className={isActive('/my-registrations')}
                    onClick={() => setMenuOpen(false)}>
                    {t('nav.myRegistrations')}
                  </Link>
                )}
                {(user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                  <>
                    <Link to="/organizer/my-events" className={isActive('/organizer/my-events')}
                      onClick={() => setMenuOpen(false)}>
                      {t('nav.myEvents')}
                    </Link>
                    <Link to="/organizer/check-in" className={isActive('/organizer/check-in')}
                      onClick={() => setMenuOpen(false)}>
                      🔐 {t('nav.checkIn')}
                    </Link>
                  </>
                )}
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className={isActive('/admin')}
                    onClick={() => setMenuOpen(false)}>
                    {t('nav.admin')}
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="navbar-auth">
            {user ? (
              <div className="navbar-controls">
                <NotificationBell />
                <div className="navbar-user">
                  <span className="user-name"
                    onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                    style={{ cursor: 'pointer' }}>
                    👤 {user.fullName}
                  </span>
                  <span className={`role-badge role-${user.role.toLowerCase()}`}>{user.role}</span>
                  <button className="btn-logout" onClick={logout}>{t('nav.logout')}</button>
                </div>
              </div>
            ) : (
              <div className="navbar-guest">
                <Link to="/login" className="btn-nav-login" onClick={() => setMenuOpen(false)}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-nav-register" onClick={() => setMenuOpen(false)}>
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
