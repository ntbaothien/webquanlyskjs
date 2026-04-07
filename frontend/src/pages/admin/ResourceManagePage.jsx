import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';

export default function ResourceManagePage() {
  const { eventId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', type: 'Equipment', quantity: 1, notes: '' });

  const fetchResources = async () => {
    try {
      const { data } = await axiosInstance.get(`/resources/${eventId}`);
      setResources(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/resources', { ...formData, eventId });
      setFormData({ name: '', type: 'Equipment', quantity: 1, notes: '' });
      fetchResources();
    } catch (err) { alert(err.response?.data?.error || err.message || 'Lỗi'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa tài nguyên này?')) return;
    try {
      await axiosInstance.delete(`/resources/${id}`);
      fetchResources();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page-container">
      <Navbar />
      <div className="admin-content" style={{ marginTop: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn-back">← Quay lại</button>
        <h2 style={{ margin: '1rem 0' }}>🛠 Quản lý Tài nguyên Sự kiện</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          <div className="form-card" style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
            <h3>Thêm tài nguyên</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Tên tài nguyên" required style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                <option value="Equipment" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Thiết bị</option>
                <option value="Venue" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Địa điểm/Hậu cần</option>
                <option value="Staff" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Nhân sự</option>
                <option value="Others" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Khác</option>
              </select>
              <input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder="Số lượng" required style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ghi chú..." style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <button type="submit" className="btn-register">Lưu</button>
            </form>
          </div>

          <div className="resource-list">
            <h3>Danh sách tài nguyên</h3>
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th>SL</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {resources.map(res => (
                  <tr key={res._id}>
                    <td>{res.name}</td>
                    <td>{res.type}</td>
                    <td>{res.quantity}</td>
                    <td>{res.status}</td>
                    <td>
                      <button onClick={() => handleDelete(res._id)} className="btn-sm btn-danger">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
