import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

export default function NotificationBell() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await axiosInstance.get('/api/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, link) => {
    try {
      await axiosInstance.put(`/api/notifications/${id}/read`);
      setShowDropdown(false);
      fetchNotifications();
      if (link) navigate(link);
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.put('/api/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className="btn-bell" 
        onClick={() => setShowDropdown(!showDropdown)}
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h4>Thông báo</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="btn-mark-all">Đánh dấu tất cả đã đọc</button>
            )}
          </div>
          <div className="dropdown-body">
            {notifications.length === 0 ? (
              <div className="empty-notifications">Chưa có thông báo nào.</div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n._id} 
                  className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(n._id, n.link)}
                >
                  <div className="noti-title">{n.title}</div>
                  <div className="noti-msg">{n.message}</div>
                  <div className="noti-time">{new Date(n.createdAt).toLocaleString('vi-VN')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
