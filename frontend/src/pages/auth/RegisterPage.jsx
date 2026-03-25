import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== confirm) return setError('Mật khẩu xác nhận không khớp');
    if (form.password.length < 6) return setError('Mật khẩu phải ít nhất 6 ký tự');
    try {
      await register(form.fullName, form.email, form.password, form.phone);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      background: 'radial-gradient(ellipse at 50% 20%,rgba(255,101,132,0.12) 0%,transparent 60%)' }}>
      <div className="animate-in" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="text-center mb-32">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
          <h1 className="gradient-text">Tham gia ngay</h1>
          <p className="mt-8">Tạo tài khoản để khám phá hàng nghìn sự kiện</p>
        </div>

        <div className="card">
          <h2 className="mb-24">Đăng ký</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input className="form-input" type="text" placeholder="Nguyen Van A"
                value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="your@email.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại (tuỳ chọn)</label>
              <input className="form-input" type="tel" placeholder="0901234567"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <input className="form-input" type="password" placeholder="••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận</label>
                <input className="form-input" type="password" placeholder="••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
            </div>

            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={isLoading}>
              {isLoading ? <span className="spinner spinner-sm" /> : '✨ Tạo tài khoản'}
            </button>
          </form>

          <p className="text-center mt-24" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
