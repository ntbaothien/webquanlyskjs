import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function MyEventsPage() {
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchEvents = async (p = page, s = statusFilter) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (s) params.status = s;
      const { data: res } = await axiosInstance.get('/organizer/my-events', { params });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy/xóa sự kiện này?')) return;
    try {
      await axiosInstance.delete(`/organizer/events/${id}`);
      setMsg({ text: 'Đã hủy/xóa sự kiện thành công', type: 'success' });
      fetchEvents();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Thao tác thất bại', type: 'error' });
    }
  };

  const statuses = ['', 'PUBLISHED', 'DRAFT', 'CANCELLED'];

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className="page-title" style={{ margin: 0 }}>📋 Sự kiện của tôi</h1>
          <Link to="/organizer/events/create" className="btn-sm btn-primary-sm" style={{ padding: '0.6rem 1.25rem', textDecoration: 'none', borderRadius: '10px' }}>
            + Tạo sự kiện mới
          </Link>
        </div>

        {msg.text && <div className={`msg-box ${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {statuses.map(s => (
            <button key={s} className={`btn-sm ${statusFilter === s ? 'btn-primary-sm' : 'btn-info'}`}
              onClick={() => { setStatusFilter(s); setPage(0); fetchEvents(0, s); }}>
              {s || 'Tất cả'}
            </button>
          ))}
        </div>

        {loading ? <div className="loading-state">⏳ Đang tải...</div>
          : data.content.length === 0 ? <div className="empty-state">😔 Chưa có sự kiện nào</div>
          : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên sự kiện</th>
                  <th>Địa điểm</th>
                  <th>Ngày bắt đầu</th>
                  <th>Số tham dự</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map(e => (
                  <tr key={e.id}>
                    <td><strong style={{ color: '#fff' }}>{e.title}</strong></td>
                    <td>{e.location}</td>
                    <td>{e.startDate ? new Date(e.startDate).toLocaleDateString('vi-VN') : '—'}</td>
                    <td>{e.currentAttendees} / {e.maxCapacity || '∞'}</td>
                    <td><span className={`event-status-tag status-${e.status?.toLowerCase()}`} style={{ position: 'static' }}>{e.status}</span></td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link to={`/organizer/events/${e.id}/edit`} className="btn-sm btn-info" style={{ textDecoration: 'none' }}>✏️ Sửa</Link>
                      <Link to={`/organizer/events/${e.id}/registrations`} className="btn-sm btn-success" style={{ textDecoration: 'none' }}>👥</Link>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(e.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        {data.totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: data.totalPages }, (_, i) => (
              <button key={i} className={`page-btn ${i === page ? 'active' : ''}`}
                onClick={() => { setPage(i); fetchEvents(i); }}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
