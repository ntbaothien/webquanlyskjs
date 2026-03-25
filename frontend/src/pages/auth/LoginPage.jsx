import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [twoFA, setTwoFA] = useState(null); // { userId }
  const [otp, setOtp] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login(form.email, form.password);
      if (result.requires2FA) {
        setTwoFA({ userId: result.userId });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { default: axiosInstance } = await import('../../utils/axiosInstance');
      const { data } = await axiosInstance.post('/auth/2fa/verify', { userId: twoFA.userId, code: otp });
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      useAuthStore.setState({ user: data.data.user });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Mã OTP không hợp lệ');
    }
  };

  if (twoFA) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        background: 'radial-gradient(ellipse at 50% 0%,rgba(108,99,255,0.15) 0%,transparent 70%)' }}>
        <div className="card animate-in" style={{ maxWidth: '420px', width: '100%' }}>
          <div className="text-center mb-24">
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔐</div>
            <h2>Xác thực 2FA</h2>
            <p className="mt-8">Nhập mã OTP được gửi đến email của bạn</p>
          </div>
          <form onSubmit={handle2FA} className="flex-col gap-16">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Mã OTP (6 số)</label>
              <input className="form-input" type="text" maxLength={6} placeholder="000000"
                value={otp} onChange={e => setOtp(e.target.value)}
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 }} required />
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit">Xác nhận</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      background: 'radial-gradient(ellipse at 50% 0%,rgba(108,99,255,0.15) 0%,transparent 70%)' }}>
      <div className="animate-in" style={{ maxWidth: '440px', width: '100%' }}>
        {/* Logo */}
        <div className="text-center mb-32">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎟️</div>
          <h1 className="gradient-text">EventHub</h1>
          <p className="mt-8">Đăng nhập để khám phá sự kiện</p>
        </div>

        <div className="card">
          <h2 className="mb-24">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="flex-col gap-16" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="your@email.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input className="form-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>

            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={isLoading}>
              {isLoading ? <><span className="spinner spinner-sm" /></> : '🚀 Đăng nhập'}
            </button>
          </form>

          <p className="text-center mt-24" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Đăng ký ngay</Link>
          </p>
        </div>

        {/* Demo Account */}
        <div className="card mt-16" style={{ padding: '16px', background: 'rgba(108,99,255,0.1)', borderColor: 'rgba(108,99,255,0.3)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>🧪 TÀI KHOẢN THỬ NGHIỆM</div>
          <div style={{ fontSize: 13 }}>Admin: <code style={{ color: 'var(--primary-light)' }}>admin@eventhub.vn</code> / <code style={{ color: 'var(--primary-light)' }}>admin123</code></div>
        </div>
      </div>
    </div>
  );
}
