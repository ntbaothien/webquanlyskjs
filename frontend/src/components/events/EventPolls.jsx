import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import CreatePollForm from './CreatePollForm';

export default function EventPolls({ eventId, isOrganizer }) {
  const { user } = useAuthStore();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = async () => {
    try {
      const { data } = await axiosInstance.get(`/api/polls/event/${eventId}`);
      setPolls(data);
    } catch (err) {
      console.error('Fetch polls error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [eventId]);

  const handleVote = async (pollId, optionIndex) => {
    if (!user) return alert('Vui lòng đăng nhập để bình chọn');
    try {
      await axiosInstance.put(`/api/polls/${pollId}/vote`, { optionIndex });
      fetchPolls(); // Refresh to see results
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi bình chọn');
    }
  };

  const handleClose = async (pollId) => {
    try {
      await axiosInstance.put(`/api/polls/${pollId}/close`);
      fetchPolls();
    } catch (err) {
      console.error('Close poll error:', err);
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cuộc bình chọn này?')) return;
    try {
      await axiosInstance.delete(`/api/polls/${pollId}`);
      fetchPolls();
    } catch (err) {
      console.error('Delete poll error:', err);
    }
  };

  if (loading) return <div>Đang tải các cuộc bình chọn...</div>;

  return (
    <div className="event-polls-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>📊 Khảo sát & Bình chọn</h3>
      </div>

      {isOrganizer && (
        <CreatePollForm eventId={eventId} onPollCreated={() => fetchPolls()} />
      )}

      {polls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Hiện chưa có cuộc bình chọn nào cho sự kiện này.
        </div>
      ) : (
        <div className="polls-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {polls.map(poll => {
            const hasVoted = poll.options.some(opt => opt.votes.includes(user?._id));
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
            const showResults = hasVoted || poll.isClosed || isOrganizer;

            return (
              <div key={poll._id} className="poll-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                {isOrganizer && (
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                    {!poll.isClosed && (
                      <button onClick={() => handleClose(poll._id)} className="btn-text" style={{ fontSize: '0.8rem' }}>Đóng bình chọn</button>
                    )}
                    <button onClick={() => handleDelete(poll._id)} className="btn-text" style={{ fontSize: '0.8rem', color: '#ef4444' }}>Xóa</button>
                  </div>
                )}
                
                <h4 style={{ marginBottom: '1.25rem', paddingRight: '4rem', color: 'var(--text-primary)' }}>{poll.question}</h4>
                
                <div className="poll-options" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {poll.options.map((opt, idx) => {
                    const voteCount = opt.votes.length;
                    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                    
                    return (
                      <div key={idx} className="poll-option-wrapper">
                        {showResults ? (
                          <div className="poll-result">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                              <span style={{ color: 'var(--text-primary)' }}>{opt.text} {opt.votes.includes(user?._id) && '✅'}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{voteCount} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ 
                                height: '100%', 
                                width: `${percentage}%`, 
                                background: 'linear-gradient(90deg, #e94560, #6c63ff)',
                                borderRadius: '4px',
                                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                              }} />
                            </div>
                          </div>
                        ) : (
                          <button 
                            className="btn-poll-vote"
                            onClick={() => handleVote(poll._id, idx)}
                            style={{ 
                              width: '100%', 
                              textAlign: 'left', 
                              padding: '0.75rem 1rem', 
                              borderRadius: '8px', 
                              background: 'var(--bg-input)', 
                              border: '1px solid var(--border)', 
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {opt.text}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {totalVotes} lượt bình chọn • {poll.isClosed ? 'Đã kết thúc' : 'Đang diễn ra'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
