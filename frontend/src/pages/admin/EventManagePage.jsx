import { useState, useEffect } from 'react';
import { AdminLayout } from './DashboardPage';
import axiosInstance from '../../utils/axiosInstance';

const statusBadge = (s) => ({
  Published: <span className="badge badge-green">Published</span>,
  Draft: <span className="badge badge-purple">Draft</span>,
  Cancelled: <span className="badge badge-red">Cancelled</span>,
  Ended: <span className="badge badge-orange">Ended</span>,
}[s] || <span className="badge badge-blue">{s}</span>);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

export default function EventManagePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Music', location: '', startTime: '', endTime: '', description: '' });
  const [formError, setFormError] = useState('');
  const { user } = { user: JSON.parse(localStorage.getItem('auth-store') || '{}')?.state?.user || {} };

  const CATEGORIES = ['Music', 'Sports', 'Conference', 'Exhibition', 'Festival', 'Workshop', 'Comedy', 'Theater', 'Food', 'Other'];

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/admin/events', { params: { status: statusFilter || undefined, limit: 20 } });
      setEvents(data.data.items || []);
      setTotal(data.data.pagination?.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await axiosInstance.post('/events', form);
      setShowCreate(false);
      setForm({ title: '', category: 'Music', location: '', startTime: '', endTime: '', description: '' });
      fetchEvents();
    } catch (err) { setFormError(err.response?.data?.error || 'Tạo thất bại'); }
  };

  const toggleStatus = async (id, currentStatus) => {
    const next = currentStatus === 'Published' ? 'Draft' : 'Published';
    try {
      await axiosInstance.put(`/events/${id}`, { status: next });
      setEvents(ev => ev.map(e => e._id === id ? { ...e, status: next } : e));
    } catch (err) { alert(err.response?.data?.error || 'Lỗi'); }
  };

  return (
    <AdminLayout>
      <div className="flex-between mb-24">
        <div>
          <h2 className="mb-4">🎪 Quản lý sự kiện</h2>
          <p>{total} sự kiện</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Tạo sự kiện</button>
      </div>

      {/* Filter */}
      <div className="flex gap-8 mb-20">
        {['', 'Published', 'Draft', 'Cancelled', 'Ended'].map(s => (
          <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s || 'Tất cả'}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Sự kiện</th><th>Danh mục</th><th>Bắt đầu</th><th>Người tạo</th><th>Trạng thái</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : events.map(ev => (
              <tr key={ev._id}>
                <td>
                  <div style={{ fontWeight: 600, maxWidth: 220 }} className="truncate">{ev.title}</div>
                  {ev.location && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📍 {ev.location}</div>}
                </td>
                <td><span className="badge badge-blue">{ev.category}</span></td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(ev.startTime)}</td>
                <td style={{ fontSize: 13 }}>{ev.createdBy?.fullName}</td>
                <td>{statusBadge(ev.status)}</td>
                <td>
                  <div className="flex gap-8">
                    <button className="btn btn-sm btn-secondary"
                      onClick={() => toggleStatus(ev._id, ev.status)}>
                      {ev.status === 'Published' ? '⏸ Ẩn' : '▶ Hiện'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">+ Tạo sự kiện mới</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            {formError && <div className="alert alert-error mb-16">{formError}</div>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Tên sự kiện *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Danh mục *</label>
                  <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Địa điểm</label>
                  <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Bắt đầu *</label>
                  <input className="form-input" type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Kết thúc *</label>
                  <input className="form-input" type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-12" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo sự kiện</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
