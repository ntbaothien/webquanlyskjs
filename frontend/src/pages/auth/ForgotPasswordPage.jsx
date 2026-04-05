import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import './Auth.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await axiosInstance.post('/auth/forgot-password', { email });
      setSuccess(response.data.message);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error || t('auth.serverError'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🔐 EventHub</div>
        <h2>{t('auth.forgotTitle')}</h2>

        {error && (
          <div className="auth-error">
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="auth-success">
            <div>{t('auth.emailSentTitle')}</div>
            <div style={{ fontSize: '13px', marginTop: '12px', opacity: 0.8, lineHeight: '1.5' }}>
              {t('auth.emailSentDesc')}
            </div>
          </div>
        )}

        {!success && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', fontSize: '14px' }}>
              {t('auth.forgotDesc')}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? t('auth.sending') : t('auth.sendEmail')}
              </button>
            </form>

            <p className="auth-footer">
              {t('auth.rememberPassword')} <Link to="/login">{t('auth.loginBtn')}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
