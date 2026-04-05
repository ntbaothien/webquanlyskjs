import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import './EmailReminderWidget.css';

export default function EmailReminderWidget({ eventId }) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStats = async () => {
    try {
      const { data } = await axiosInstance.get(
        `/reminders/events/${eventId}/stats`
      );
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchHistory = async (page = 0) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(
        `/reminders/events/${eventId}`,
        { params: { page, limit: 10 } }
      );
      setHistory(data.content || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(page);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, [eventId]);

  const handleSendReminder = async () => {
    if (!window.confirm('Gửi email nhắc nhở cho tất cả người tham dự?')) return;
    setSending(true);
    try {
      const { data } = await axiosInstance.post(
        `/reminders/events/${eventId}/send`
      );
      setMsg({ text: `✅ Gửi thành công ${data.sent} email nhắc nhở`, type: 'success' });
      fetchStats();
      fetchHistory();
    } catch (err) {
      setMsg({
        text: err.response?.data?.error || 'Gửi nhắc nhở thất bại',
        type: 'error'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="reminder-widget">
      <h3 className="widget-title">📧 Email Nhắc Nhở</h3>

      {msg.text && (
        <div className={`msg-box ${msg.type}`} style={{ marginBottom: '1rem' }}>
          {msg.text}
        </div>
      )}

      {/* Stats Section */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Tổng cộng</div>
            <div className="stat-value">{stats.totalSent + stats.totalFailed}</div>
          </div>
          <div className="stat-card success">
            <div className="stat-label">Đã gửi</div>
            <div className="stat-value">{stats.totalSent}</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-label">Thất bại</div>
            <div className="stat-value">{stats.totalFailed}</div>
          </div>
          <div className="stat-card info">
            <div className="stat-label">Tỉ lệ thành công</div>
            <div className="stat-value">{stats.successRate}%</div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        className="btn-send-reminder"
        onClick={handleSendReminder}
        disabled={sending}
      >
        {sending ? '⏳ Đang gửi...' : '📤 Gửi Nhắc Nhở Ngay'}
      </button>

      {/* History Section */}
      <div className="history-section">
        <h4 className="history-title">📋 Lịch sử Email</h4>

        {loading ? (
          <div className="loading-state">⏳ Đang tải...</div>
        ) : history.length === 0 ? (
          <div className="empty-state">Chưa có email nào được gửi</div>
        ) : (
          <>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                    <th>Ngày gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="email-text">{item.attendeeEmail}</span>
                      </td>
                      <td>
                        <span className="type-badge">
                          {item.reminderType === '24h'
                            ? '24 giờ trước'
                            : '1 giờ trước'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${item.status}`}
                        >
                          {item.status === 'sent' ? '✅ Đã gửi' : '❌ Thất bại'}
                        </span>
                      </td>
                      <td>
                        {new Date(item.sentAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${i === currentPage ? 'active' : ''}`}
                    onClick={() => fetchHistory(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
