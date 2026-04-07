import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import { toast } from '../../components/common/Toast';
import './Profile.css';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: user?.fullName || '' });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  // Load user stats
  useEffect(() => {
    if (user) {
      axiosInstance.get('/users/me/stats').then(r => setStats(r.data)).catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axiosInstance.put('/users/me', form);
      updateUser(data.data);
      toast(t('profile.updateSuccess'), 'success');
    } catch {
      toast(t('profile.updateFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const current = fd.get('currentPassword');
    const newPw = fd.get('newPassword');
    const confirm = fd.get('confirmPassword');

    if (newPw !== confirm) {
      toast(t('profile.passwordMismatch'), 'error');
      return;
    }
    if (newPw.length < 6) {
      toast(t('profile.passwordMinLen'), 'error');
      return;
    }

    try {
      await axiosInstance.put('/users/me/password', { currentPassword: current, newPassword: newPw });
      toast(t('profile.passwordChanged'), 'success');
      e.target.reset();
    } catch (err) {
      toast(err.response?.data?.error || t('profile.passwordChangeFailed'), 'error');
    }
  };

  const roleMeta = {
    ADMIN:     { label: t('profile.roleAdmin'),     icon: '🛡️', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    ORGANIZER: { label: t('profile.roleOrganizer'), icon: '🎪', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    ATTENDEE:  { label: t('profile.roleAttendee'),  icon: '🎫', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  };

  const role = roleMeta[user?.role] || { label: user?.role, icon: '👤', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' };
  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const quickLinks = [
    user?.role === 'ATTENDEE' && { label: t('profile.myRegistrations'), icon: '🎟️', to: '/my-registrations' },
    user?.role === 'ATTENDEE' && { label: t('profile.savedEvents'),      icon: '💾', to: '/profile/saved' },
    user?.role === 'ATTENDEE' && { label: t('profile.walletTopup'),      icon: '💰', to: '/wallet' },
    { label: '🏆 Điểm thưởng & Hạng',      icon: '✨', to: '/profile/loyalty' },
    { label: '🏪 Chợ bán lại vé',          icon: '🔄', to: '/marketplace' },
    (user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && { label: t('profile.myEvents'),    icon: '📋', to: '/organizer/my-events' },
    (user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && { label: t('profile.createEvent'), icon: '➕', to: '/organizer/events/create' },
    user?.role === 'ADMIN' && { label: t('profile.dashboard'),      icon: '📊', to: '/admin' },
    user?.role === 'ADMIN' && { label: t('profile.userManagement'), icon: '👥', to: '/admin/users' },
  ].filter(Boolean);

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="profile-container">
        {/* Cover + Avatar Section */}
        <div className="profile-cover" style={{ background: role.gradient }}>
          <div className="profile-cover-overlay" />
        </div>

        <div className="profile-header">
          <div className="profile-avatar" style={{ background: role.gradient }}>
            {initials}
          </div>
          <div className="profile-identity">
            <h1 className="profile-name">{user?.fullName}</h1>
            <p className="profile-email">{user?.email}</p>
            <span className="profile-role-badge" style={{ background: role.gradient }}>
              {role.icon} {role.label}
            </span>
          </div>
        </div>

        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-info">
            <span className="balance-label">{t('profile.balanceLabel')}</span>
            <span className="balance-value">
              {stats?.balance != null
                ? `${Number(stats.balance).toLocaleString(locale)}đ`
                : '—'}
            </span>
          </div>
          <div className="balance-actions">
            <button className="balance-btn balance-btn-deposit"
              onClick={() => navigate('/wallet')}>
              {t('profile.deposit')}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="profile-stats">
          <div className="ps-item">
            <span className="ps-value">{stats?.registrations ?? '—'}</span>
            <span className="ps-label">{t('profile.registrations')}</span>
          </div>
          <div className="ps-item">
            <span className="ps-value">{stats?.bookings ?? '—'}</span>
            <span className="ps-label">{t('profile.bookings')}</span>
          </div>
          {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
            <div className="ps-item">
              <span className="ps-value">{stats?.eventsCreated ?? '—'}</span>
              <span className="ps-label">{t('profile.eventsCreated')}</span>
            </div>
          )}
          <div className="ps-item">
            <span className="ps-value">{stats?.reviews ?? '—'}</span>
            <span className="ps-label">{t('profile.reviews')}</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="profile-quick-links">
          {quickLinks.map((link, i) => (
            <Link key={i} to={link.to} className="pql-item">
              <span className="pql-icon">{link.icon}</span>
              <span className="pql-label">{link.label}</span>
              <span className="pql-arrow">→</span>
            </Link>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}>
            {t('profile.infoTab')}
          </button>
          <button className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}>
            {t('profile.securityTab')}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="profile-card">
            <h3 className="pc-title">{t('profile.editProfile')}</h3>
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="pf-group">
                <label className="pf-label">{t('profile.fullName')}</label>
                <input className="pf-input" value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  required placeholder={t('profile.enterName')} />
              </div>

              <div className="pf-group">
                <label className="pf-label">{t('profile.email')}</label>
                <input className="pf-input disabled" value={user?.email} disabled />
                <span className="pf-hint">{t('profile.emailCantChange')}</span>
              </div>

              <div className="pf-group">
                <label className="pf-label">{t('profile.role')}</label>
                <input className="pf-input disabled" value={role.label} disabled />
              </div>

              <div className="pf-group">
                <label className="pf-label">{t('profile.joinDate')}</label>
                <input className="pf-input disabled"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : 'N/A'}
                  disabled />
              </div>

              <button type="submit" className="pf-submit" disabled={loading}>
                {loading ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="profile-card">
            <h3 className="pc-title">{t('profile.changePasswordTitle')}</h3>
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="pf-group">
                <label className="pf-label">{t('profile.currentPassword')}</label>
                <input className="pf-input" type="password" name="currentPassword"
                  required placeholder={t('profile.enterCurrentPassword')} />
              </div>
              <div className="pf-group">
                <label className="pf-label">{t('profile.newPassword')}</label>
                <input className="pf-input" type="password" name="newPassword"
                  required minLength={6} placeholder={t('profile.enterNewPassword')} />
              </div>
              <div className="pf-group">
                <label className="pf-label">{t('profile.confirmNewPassword')}</label>
                <input className="pf-input" type="password" name="confirmPassword"
                  required placeholder={t('profile.enterConfirmPassword')} />
              </div>
              <button type="submit" className="pf-submit">
                {t('profile.changePasswordBtn')}
              </button>
            </form>

            <hr className="pc-divider" />

            <div className="danger-zone">
              <h4 className="dz-title">{t('profile.dangerZone')}</h4>
              <p className="dz-desc">{t('profile.logoutDesc')}</p>
              <button className="dz-btn" onClick={logout}>
                {t('profile.logoutBtn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
