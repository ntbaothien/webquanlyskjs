import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import './Auth.css';
import { useState } from 'react';

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLocked(false);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.type === 'ACCOUNT_LOCKED') {
        setIsLocked(true);
      }
      setError(data?.error || t('auth.loginFailed'));
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🎪 EventHub</div>
        <h2>{t('auth.login')}</h2>
        {error && (
          <div className={`auth-error ${isLocked ? 'auth-locked' : ''}`}>
            {isLocked && <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>}
            <div>{error}</div>
            {isLocked && (
              <a
                href="mailto:toivaem136317@gmail.com"
                style={{ color: '#e94560', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}
              >
                📧 toivaem136317@gmail.com
              </a>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '16px' }}>
            <Link to="/forgot-password" style={{ color: '#a78bfa', fontSize: '13px', textDecoration: 'none' }}>
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>
        <p className="auth-footer">{t('auth.noAccount')} <Link to="/register">{t('auth.registerBtn')}</Link></p>
      </div>
    </div>
  );
}
