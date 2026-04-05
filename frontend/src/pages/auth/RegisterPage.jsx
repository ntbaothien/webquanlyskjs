import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import './Auth.css';
import { useState } from 'react';

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    try {
      await register(form.fullName, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('auth.registerFailed'));
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🎪 EventHub</div>
        <h2>{t('auth.createAccountTitle')}</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.fullName')}</label>
            <input type="text" placeholder={t('auth.namePlaceholder')} value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input type="password" placeholder={t('auth.passwordMin')} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>{t('auth.confirmPassword')}</label>
            <input type="password" placeholder="••••••••" value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
          </div>
          <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? t('auth.creatingAccount') : t('auth.register')}
          </button>
        </form>
        <p className="auth-footer">{t('auth.hasAccount')} <Link to="/login">{t('auth.loginBtn')}</Link></p>
      </div>
    </div>
  );
}
