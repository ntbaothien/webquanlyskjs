import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';

export default function EventForum({ eventId }) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    try {
      const { data } = await axiosInstance.get(`/forum/${eventId}`);
      setPosts(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchPosts(); }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await axiosInstance.post('/forum', { eventId, content });
      setContent('');
      fetchPosts();
    } catch (err) { alert(err.response?.data?.error || 'Hệ thống đang bận'); }
    finally { setLoading(false); }
  };

  const handleComment = async (postId, c) => {
    if (!c.trim()) return;
    try {
      await axiosInstance.post(`/forum/${postId}/comment`, { content: c });
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bài đăng này?')) return;
    try {
      await axiosInstance.delete(`/forum/${id}`);
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="event-forum">
      <div className="forum-header">
        <h3>💬 Diễn đàn thảo luận</h3>
        <p>Chia sẻ câu hỏi hoặc ý kiến của bạn về sự kiện này.</p>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="forum-post-form" style={{ marginBottom: '2rem' }}>
          <textarea value={content} onChange={e => setContent(e.target.value)} 
            placeholder="Viết câu hỏi hoặc ý kiến của bạn..." />
          <button type="submit" className="btn-register" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Đang đăng...' : 'Đăng bài'}
          </button>
        </form>
      ) : (
        <div className="forum-login-prompt">Vui lòng đăng nhập để tham gia thảo luận.</div>
      )}

      <div className="posts-list">
        {posts.map(post => (
          <div key={post._id} className="forum-post-card">
            <div className="forum-post-auth">
              <strong>{post.userFullName}</strong>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="forum-post-content">{post.content}</div>
            {(user?._id === post.userId || user?.role === 'ADMIN') && (
              <button onClick={() => handleDelete(post._id)} className="btn-text" style={{ color: '#ef4444' }}>Xóa</button>
            )}

            <div className="forum-comments" style={{ marginTop: '1rem' }}>
              {post.comments.map((c, i) => (
                <div key={i} className="forum-comment-item">
                  <strong>{c.userFullName}:</strong> {c.content}
                </div>
              ))}
              {user && (
                <form onSubmit={e => {
                  e.preventDefault();
                  handleComment(post._id, e.target.comment.value);
                  e.target.reset();
                }} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <input name="comment" placeholder="Trả lời..." style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'white' }} />
                  <button type="submit" className="btn-sm btn-primary-sm">Gửi</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
