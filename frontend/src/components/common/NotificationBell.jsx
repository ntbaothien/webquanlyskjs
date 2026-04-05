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
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000); // 2 mins
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

  const handleToggle = () => setShowDropdown(!showDropdown);

  const handleMarkRead = async (id, link) => {
    try {
      await axiosInstance.put(`/api/notifications/${id}/read`);
      setShowDropdown(false);
      fetchNotifications();
      if (link) navigate(link);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="btn-bell" onClick={handleToggle} title="Thông báo">
        🔔 {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header"><h4>Thông báo</h4></div>
          <div className="dropdown-body">
            {notifications.length === 0 ? (
              <div className="empty-notifications">Chưa có thông báo nào</div>
            ) : (
              notifications.map(n => (
                <div key={n._id} className={`notification-item ${!n.isRead ? 'unread' : ''}`} 
                  onClick={() => handleMarkRead(n._id, n.link)}>
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
