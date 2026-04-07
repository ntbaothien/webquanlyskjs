import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function NotiIcon({ type }) {
  const map = {
    TOPUP:        { icon: '💰', bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
    BOOKING:      { icon: '🎟️', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    REGISTRATION: { icon: '✅', bg: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
    REFUND:       { icon: '↩️', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
    EVENT:        { icon: '📅', bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
    EVENT_UPDATE: { icon: '📢', bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
    WAITLIST:     { icon: '🔔', bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
    SYSTEM:       { icon: '🔔', bg: 'rgba(233,69,96,0.15)',   color: '#e94560' },
  };
  const cfg = map[type] || map.SYSTEM;
  return (
    <span className="noti-icon-wrap" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon}
    </span>
  );
}

export default function NotificationBell() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [flash, setFlash] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await axiosInstance.get('/notifications');
      const list = Array.isArray(data) ? data : (data.notifications || []);
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  }, [user]);

  // Poll mỗi 2 phút làm fallback
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Socket.IO — nhận thông báo realtime
  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', user._id || user.id);
    });

    socket.on('notification', (newNotif) => {
      setNotifications(prev => [{ ...newNotif, isRead: false }, ...prev]);
      setUnreadCount(prev => prev + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setShowDropdown(v => !v);

  const handleMarkRead = async (id, link) => {
    try {
      await axiosInstance.put(`/notifications/${id}/read`);
      setShowDropdown(false);
      fetchNotifications();
      if (link) navigate(link);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    const unread = notifications.filter(n => !n.isRead);
    await Promise.allSettled(unread.map(n => axiosInstance.put(`/notifications/${n._id}/read`)));
    fetchNotifications();
  };

  if (!user) return null;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className={`btn-bell${flash ? ' bell-flash' : ''}`} onClick={handleToggle} title="Thông báo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className={`bell-badge${flash ? ' badge-pulse' : ''}`}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <div className="dropdown-header-left">
              <h4>Thông báo</h4>
              {unreadCount > 0 && <span className="noti-unread-pill">{unreadCount} mới</span>}
            </div>
            {unreadCount > 0 && (
              <button className="btn-mark-all" onClick={handleMarkAllRead}>
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="dropdown-body">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <span className="empty-noti-icon">🔕</span>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                  onClick={() => handleMarkRead(n._id, n.link)}
                >
                  <NotiIcon type={n.type} />
                  <div className="noti-content">
                    <div className="noti-title">{n.title}</div>
                    <div className="noti-msg">{n.message}</div>
                    <div className="noti-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <span className="noti-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
