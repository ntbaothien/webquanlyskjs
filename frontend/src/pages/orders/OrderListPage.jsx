import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';
import '../auth/Auth.css';

const DEFAULT_ZONE = { id: '', name: '', description: '', color: '#6c63ff', totalSeats: 100, price: 0 };
const ZONE_COLORS = ['#FFD700', '#4FC3F7', '#81C784', '#FF8A65', '#CE93D8', '#4DB6AC'];

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', location: '',
    startDate: '', endDate: '', maxCapacity: 0,
    status: 'DRAFT', tagsInput: '', isFree: true
  });
  const [zones, setZones] = useState([]);
  const [bannerFile, setBannerFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      axiosInstance.get(`/events/${id}`).then(({ data }) => {
        const e = data.event;
        setForm({
          title: e.title || '',
          description: e.description || '',
          location: e.location || '',
          startDate: e.startDate ? e.startDate.substring(0, 16) : '',
          endDate: e.endDate ? e.endDate.substring(0, 16) : '',
          maxCapacity: e.maxCapacity || 0,
          status: e.status || 'DRAFT',
          tagsInput: (e.tags || []).join(', '),
          isFree: e.free !== false
        });
        if (e.seatZones?.length) setZones(e.seatZones);
      });
    }
  }, [id]);

  const addZone = () => {
    const idx = zones.length;
    setZones([...zones, {
      ...DEFAULT_ZONE,
      id: `zone-${Date.now()}`,
      color: ZONE_COLORS[idx % ZONE_COLORS.length]
    }]);
  };

  const updateZone = (i, field, val) => {
    const updated = [...zones];
    updated[i] = { ...updated[i], [field]: field === 'totalSeats' || field === 'price' ? Number(val) : val };
    setZones(updated);
  };

  const removeZone = (i) => setZones(zones.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.isFree && zones.length === 0) {
      setError('Sự kiện có phí cần ít nhất 1 khu vực (zone)');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('location', form.location);
    fd.append('startDate', form.startDate);
    fd.append('endDate', form.endDate);
    fd.append('maxCapacity', form.maxCapacity);
    fd.append('status', form.status);
    fd.append('tagsInput', form.tagsInput);
    fd.append('isFree', form.isFree);
    if (!form.isFree && zones.length > 0) {
      fd.append('zonesJson', JSON.stringify(zones));
    }
    if (bannerFile) fd.append('bannerFile', bannerFile);
    try {
      if (id) {
        await axiosInstance.put(`/organizer/events/${id}`, fd);
      } else {
        await axiosInstance.post('/organizer/events', fd);
      }
      navigate('/organizer/my-events');
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="form-card" style={{ maxWidth: 760 }}>
          <h2>{id ? '✏️ Chỉnh sửa sự kiện' : '🎪 Tạo sự kiện mới'}</h2>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            {/* === Thông tin cơ bản === */}
            <div className="form-group">
              <label>Tiêu đề *</label>
              <input type="text" value={form.title} onChange={f('title')} placeholder="Tên sự kiện" required />
            </div>
            <div className="form-group">
              <label>Mô tả *</label>
              <textarea value={form.description} onChange={f('description')} placeholder="Mô tả sự kiện..." required />
            </div>
            <div className="form-group">
              <label>Địa điểm *</label>
              <input type="text" value={form.location} onChange={f('location')} placeholder="Địa chỉ tổ chức" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Ngày bắt đầu</label>
                <input type="datetime-local" value={form.startDate} onChange={f('startDate')} />
              </div>
              <div className="form-group">
                <label>Ngày kết thúc</label>
                <input type="datetime-local" value={form.endDate} onChange={f('endDate')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Số chỗ tối đa (0 = không giới hạn)</label>
                <input type="number" min="0" value={form.maxCapacity} onChange={f('maxCapacity')} />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select value={form.status} onChange={f('status')}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Tags (cách nhau bởi dấu phẩy)</label>
              <input type="text" value={form.tagsInput} onChange={f('tagsInput')} placeholder="music, entertainment, tech" />
            </div>
            <div className="form-group">
              <label>Ảnh bìa (Banner)</label>
              <input type="file" accept="image/*" style={{ color: 'rgba(255,255,255,0.7)' }}
                onChange={e => setBannerFile(e.target.files[0])} />
            </div>

            {/* === Toggle Free/Paid === */}
            <div className="form-group" style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '12px', padding: '1rem 1.25rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <label style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 700 }}>Loại sự kiện</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { val: true, label: '🆓 Miễn phí', desc: 'Người dùng đăng ký không mất phí' },
                  { val: false, label: '💳 Có phí', desc: 'Bán vé theo khu vực (zone)' },
                ].map(opt => (
                  <div key={String(opt.val)} onClick={() => setForm({ ...form, isFree: opt.val })}
                    style={{
                      flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${form.isFree === opt.val ? '#6c63ff' : 'rgba(255,255,255,0.1)'}`,
                      background: form.isFree === opt.val ? 'rgba(108,99,255,0.15)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: form.isFree === opt.val ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* === Zone management (chỉ khi có phí) === */}
            {!form.isFree && (
              <div className="form-group" style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                padding: '1.25rem', border: '1px solid rgba(167,139,250,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 700, margin: 0 }}>🗺️ Khu vực (Zones)</label>
                  <button type="button" onClick={addZone} style={{
                    padding: '0.4rem 1rem', borderRadius: '8px',
                    background: 'rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.4)',
                    color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                  }}>+ Thêm Zone</button>
                </div>
                {zones.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    Chưa có zone. Nhấn "+ Thêm Zone" để bắt đầu.
                  </p>
                )}
                {zones.map((zone, i) => (
                  <div key={zone.id || i} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                    padding: '1rem', marginBottom: '0.75rem',
                    borderLeft: `4px solid ${zone.color}`
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>Tên khu *</label>
                        <input type="text" value={zone.name}
                          onChange={e => updateZone(i, 'name', e.target.value)}
                          placeholder="VD: VIP, Standard..." required={!form.isFree} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>Màu sắc</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                          {ZONE_COLORS.map(c => (
                            <div key={c} onClick={() => updateZone(i, 'color', c)}
                              style={{
                                width: 24, height: 24, borderRadius: '50%', background: c,
                                cursor: 'pointer', border: zone.color === c ? '3px solid #fff' : '2px solid transparent',
                                transition: 'border 0.15s'
                              }} />
                          ))}
                        </div>
                      </div>
                      <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.8rem' }}>Mô tả</label>
                        <input type="text" value={zone.description}
                          onChange={e => updateZone(i, 'description', e.target.value)}
                          placeholder="VD: Hàng ghế đầu, gần sân khấu..." />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>Tổng số ghế</label>
                        <input type="number" min="1" value={zone.totalSeats}
                          onChange={e => updateZone(i, 'totalSeats', e.target.value)} required={!form.isFree} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>Giá vé (VND)</label>
                        <input type="number" min="0" value={zone.price}
                          onChange={e => updateZone(i, 'price', e.target.value)} required={!form.isFree} />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeZone(i)}
                      style={{
                        marginTop: '0.5rem', padding: '0.3rem 0.8rem', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem'
                      }}>🗑 Xóa zone này</button>
                  </div>
                ))}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Đang lưu...' : id ? 'Cập nhật' : 'Tạo sự kiện'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>Hủy</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
