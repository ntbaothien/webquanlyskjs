import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import useAuthStore from '../../store/authStore';
import axiosInstance from '../../utils/axiosInstance';
import './ChatBox.css';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, { autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return socketInstance;
}

export default function ChatBox() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Connect socket when user logged in
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    socket.connect();
    const userId = user.id || user._id;
    socket.emit('join', userId);
    socket.emit('chat:join', { userId: userId, userName: user.fullName });

    // Load history
    axiosInstance.get('/chat/history').then(r => {
      setMessages(r.data || []);
    }).catch(() => {
      // Show welcome message if no history
      setMessages([{
        _id: 'welcome',
        senderId: 'bot',
        senderName: t('chat.botName'),
        message: t('chat.welcome'),
        isBot: true,
        createdAt: new Date().toISOString()
      }]);
    });

    socket.on('chat:message', (msg) => {
      setMessages(prev => {
        // avoid duplicates
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (!open) setUnread(prev => prev + 1);
    });

    return () => {
      socket.off('chat:message');
    };
  }, [user]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(scrollToBottom, 100);
      inputRef.current?.focus();
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !user) return;

    const userId = user.id || user._id;

    const socket = getSocket();

    setInput('');
    setTyping(true);

    socket.emit('chat:message', {
      userId: userId,
      userName: user.fullName,
      userRole: user.role,
      message: text
    });

    // Hide typing after max 4s (bot will respond via socket)
    setTimeout(() => setTyping(false), 4000);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chatbox-fab">
      {/* Chat Window */}
      {open && (
        <div className="chatbox-window">
          {/* Header */}
          <div className="chatbox-header">
            <div className="chatbox-header-avatar">🤖</div>
            <div className="chatbox-header-info">
              <div className="chatbox-header-name">{t('chat.botName')}</div>
              <div className="chatbox-header-status">Online</div>
            </div>
            <button className="chatbox-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          {user ? (
            <>
              <div className="chatbox-messages">
                {messages.map((msg) => {
                  const isCurrentUser = msg.senderId === (user.id || user._id);
                  return (
                    <div
                      key={msg._id}
                      className={`chat-msg ${isCurrentUser && !msg.isBot ? 'user' : 'bot'}`}
                    >
                      {(msg.isBot || !isCurrentUser) && (
                        <div className="chat-msg-avatar">🤖</div>
                      )}
                      <div>
                        <div className="chat-bubble">{msg.message}</div>
                        <div className="chat-bubble-time">{formatTime(msg.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typing && (
                  <div className="chat-msg bot">
                    <div className="chat-msg-avatar">🤖</div>
                    <div className="typing-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chatbox-input-row">
                <input
                  ref={inputRef}
                  className="chatbox-input"
                  placeholder={t('chat.placeholder')}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  maxLength={500}
                />
                <button
                  className="chatbox-send"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                >
                  ➤
                </button>
              </div>
            </>
          ) : (
            <div className="chatbox-login-prompt">
              <p>💬 {t('chat.loginRequired')}</p>
              <p style={{ marginTop: '0.5rem' }}>
                <Link to="/login">{t('nav.login')}</Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* FAB Button */}
      <button
        className="chatbox-toggle"
        onClick={() => setOpen(v => !v)}
        title={t('chat.title')}
      >
        {open ? '✕' : '💬'}
        {unread > 0 && !open && (
          <span className="chatbox-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </div>
  );
}
