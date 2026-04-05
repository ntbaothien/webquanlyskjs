import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import './Auth.css';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Liên kết không hợp lệ');
      setIsTokenValid(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axiosInstance.post(`/auth/reset-password/${token}`, {
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      setSuccess(response.data.message);
      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Không thể kết nối đến server';
      setError(errorMsg);
      setIsTokenValid(false);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🔐 EventHub</div>
        <h2>Đặt lại mật khẩu</h2>

        {error && (
          <div className="auth-error">
            <div>{error}</div>
            {!isTokenValid && (
              <Link to="/forgot-password" style={{ color: '#e94560', marginTop: '8px', display: 'block' }}>
                📧 Yêu cầu liên kết mới
              </Link>
            )}
          </div>
        )}

        {success && (
          <div className="auth-success">
            <div>✅ {success}</div>
            <div style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
              Chuyển hướng đến đăng nhập trong 2 giây...
            </div>
          </div>
        )}

        {isTokenValid && !success && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', fontSize: '14px' }}>
              Nhập mật khẩu mới của bạn
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button className="btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
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
