import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function ResourceManagePage() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form state for adding/editing
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', quantity: 1, status: 'PENDING', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventRes, resourceRes] = await Promise.all([
        axiosInstance.get(`/events/${eventId}`),
        axiosInstance.get(`/api/resources/event/${eventId}`)
      ]);
      setEvent(eventRes.data.event);
      setResources(resourceRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axiosInstance.put(`/api/resources/${editingId}`, form);
        setMsg({ text: 'Cập nhật tài nguyên thành công', type: 'success' });
      } else {
        await axiosInstance.post('/api/resources', { ...form, eventId });
        setMsg({ text: 'Thêm tài nguyên thành công', type: 'success' });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', quantity: 1, status: 'PENDING', notes: '' });
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Thao tác thất bại', type: 'error' });
    }
  };

  const handleEdit = (res) => {
    setForm({ name: res.name, quantity: res.quantity, status: res.status, notes: res.notes });
    setEditingId(res._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài nguyên này?')) return;
    try {
      await axiosInstance.delete(`/api/resources/${id}`);
      setMsg({ text: 'Đã xóa tài nguyên', type: 'success' });
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Xóa thất bại', type: 'error' });
    }
  };

  if (loading) return <><Navbar /><div className="page-container">⏳ Đang tải...</div></>;
  if (error) return <><Navbar /><div className="page-container-error">{error}</div></>;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>🛠 Quản lý tài nguyên</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>Sự kiện: <strong>{event?.title}</strong></p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', quantity: 1, status: 'PENDING', notes: '' }); }} 
            className="btn-sm btn-primary-sm">
            {showForm ? '❌ Đóng' : '+ Thêm tài nguyên'}
          </button>
        </div>

        {msg.text && <div className={`msg-box ${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

        {showForm && (
          <div className="form-card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editingId ? '✏️ Chỉnh sửa' : '➕ Thêm mới'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Tên tài nguyên *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Ví dụ: Máy chiếu, Micro, Ghế..." />
              </div>
              <div className="form-group">
                <label>Số lượng</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="PENDING">🕒 Chờ xử lý</option>
                  <option value="CONFIRMED">✅ Đã xác nhận</option>
                  <option value="DELIVERED">🚚 Đã giao</option>
                  <option value="RETURNED">🔄 Đã trả</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Ghi chú</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Ghi chú chi tiết (nếu có)..." />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-sm btn-primary-sm">{editingId ? 'Cập nhật' : 'Thêm'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-sm btn-info">Hủy</button>
              </div>
            </form>
          </div>
        )}

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên tài nguyên</th>
                <th>Số lượng</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {resources.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Chưa có tài nguyên nào được đăng ký.</td></tr>
              ) : resources.map(res => (
                <tr key={res._id}>
                  <td><strong>{res.name}</strong></td>
                  <td>{res.quantity}</td>
                  <td>
                    <span className={`status-tag status-${res.status.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {res.status === 'PENDING' && '🕒 Chờ'}
                      {res.status === 'CONFIRMED' && '✅ OK'}
                      {res.status === 'DELIVERED' && '🚚 Đã giao'}
                      {res.status === 'RETURNED' && '🔄 Đã trả'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{res.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleEdit(res)} className="btn-sm btn-info">✏️</button>
                      <button onClick={() => handleDelete(res._id)} className="btn-sm btn-danger">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button onClick={() => navigate('/organizer/my-events')} className="btn-sm btn-info">🔙 Quay lại danh sách sự kiện</button>
        </div>
      </div>
    </>
  );
}
