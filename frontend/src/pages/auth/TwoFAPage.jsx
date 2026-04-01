import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function TwoFAPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const userId = location.state?.userId;

  // Nếu truy cập thẳng mà không có state userId từ Login
  if (!userId) {
    navigate('/login', { replace: true });
    return null;
  }

  const handle2FA = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { default: axiosInstance } = await import('../../utils/axiosInstance');
      const { data } = await axiosInstance.post('/auth/2fa/verify', { userId, code: otp });
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      useAuthStore.setState({ user: data.data.user });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      background: 'radial-gradient(ellipse at 50% 0%,rgba(108,99,255,0.15) 0%,transparent 70%)' }}>
      <div className="card animate-in" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="text-center mb-24">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔐</div>
          <h2>Xác thực 2 bước</h2>
          <p className="mt-8">Vui lòng nhập mã OTP 6 số được gửi đến email của bạn</p>
        </div>
        <form onSubmit={handle2FA} className="flex-col gap-16" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
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
