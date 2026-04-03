import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

export default function EventForum({ eventId }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchPosts = async () => {
    try {
      const { data } = await axiosInstance.get(`/api/forum/event/${eventId}`);
      setPosts(data);
    } catch (err) {
      console.error('Fetch forum error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [eventId]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!newPost.trim()) return;

    try {
      await axiosInstance.post('/api/forum', { eventId, content: newPost });
      setNewPost('');
      setMsg({ text: 'Đã đăng bài thành công!', type: 'success' });
      fetchPosts();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Lỗi khi đăng bài', type: 'error' });
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!replyContent.trim()) return;

    try {
      await axiosInstance.post(`/api/forum/${postId}/comment`, { content: replyContent });
      setReplyContent('');
      setReplyTo(null);
      setMsg({ text: 'Đã trả lời thành công!', type: 'success' });
      fetchPosts();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Lỗi khi bình luận', type: 'error' });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await axiosInstance.delete(`/api/forum/${postId}`);
      setMsg({ text: 'Đã xóa bài viết', type: 'success' });
      fetchPosts();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Lỗi khi xóa', type: 'error' });
    }
  };

  if (loading) return <div className="forum-loading">⏳ Đang tải thảo luận...</div>;

  return (
    <div className="event-forum">
      <div className="forum-header">
        <h3>💬 Diễn đàn công cộng</h3>
        <p>Trao đổi, đặt câu hỏi về sự kiện này</p>
      </div>

      {msg.text && (
        <div className={`msg-box ${msg.type}`} style={{ marginBottom: '1rem' }}>
          {msg.text}
          <button onClick={() => setMsg({ text: '', type: '' })} className="msg-close">✕</button>
        </div>
      )}

      {/* Post creation form */}
      <div className="forum-post-form">
        {!user ? (
          <div className="forum-login-prompt">
            <p>Vui lòng đăng nhập để tham gia thảo luận.</p>
            <button onClick={() => navigate('/login')} className="btn-sm btn-info">Đăng nhập</button>
          </div>
        ) : (
          <form onSubmit={handlePostSubmit}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Bạn có câu hỏi hoặc ý kiến gì về sự kiện này?"
              required
            />
            <button type="submit" className="btn-register" style={{ width: 'auto', marginTop: '0.5rem' }}>
              🏷️ Đăng bài viết
            </button>
          </form>
        )}
      </div>

      <div className="forum-posts-list">
        {posts.length === 0 ? (
          <p className="forum-empty">Chưa có chủ đề thảo luận nào. Hãy là người đầu tiên!</p>
        ) : (
          posts.map(post => (
            <div key={post._id} className="forum-post-card">
              <div className="forum-post-main">
                <div className="forum-post-auth">
                  <strong>👤 {post.userFullName}</strong>
                  <span>{new Date(post.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="forum-post-content">{post.content}</div>
                <div className="forum-post-actions">
                  <button onClick={() => setReplyTo(replyTo === post._id ? null : post._id)} className="btn-text">
                    💬 Trả lời ({post.comments.length})
                  </button>
                  {(user?._id === post.userId || user?.role === 'ADMIN') && (
                    <button onClick={() => handleDeletePost(post._id)} className="btn-text btn-danger-text">
                      🗑️ Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* Comments list */}
              {post.comments.length > 0 && (
                <div className="forum-comments">
                  {post.comments.map(comment => (
                    <div key={comment._id} className="forum-comment-item">
                      <div className="forum-comment-auth">
                        <strong>{comment.userFullName}</strong>
                        <span>{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="forum-comment-content">{comment.content}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyTo === post._id && (
                <div className="forum-reply-form">
                  {!user ? (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Vui lòng đăng nhập để trả lời.</p>
                  ) : (
                    <form onSubmit={(e) => handleCommentSubmit(e, post._id)}>
                      <input 
                        type="text" 
                        value={replyContent} 
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Viết câu trả lời..."
                        autoFocus
                        required
                      />
                      <button type="submit">Gửi</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
