import { Link } from 'react-router-dom';
import { useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import './Auth.css';

export default function ForgotPasswordPage() {
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
      setError(err.response?.data?.error || 'Không thể kết nối đến server');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🔐 EventHub</div>
        <h2>Quên mật khẩu?</h2>

        {error && (
          <div className="auth-error">
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="auth-success">
            <div>✅ Email đã được gửi!</div>
            <div style={{ fontSize: '13px', marginTop: '12px', opacity: 0.8, lineHeight: '1.5' }}>
              📧 Kiểm tra email của bạn để tìm liên kết đặt lại mật khẩu.<br/>
              (Nếu chạy local, check console backend để lấy link)
            </div>
          </div>
        )}

        {!success && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', fontSize: '14px' }}>
              Nhập email của bạn và chúng tôi sẽ gửi liên kết đặt lại mật khẩu
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Đang gửi...' : 'Gửi email'}
              </button>
            </form>

            <p className="auth-footer">
              Nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
