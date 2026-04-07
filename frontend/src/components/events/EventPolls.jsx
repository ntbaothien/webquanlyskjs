import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import CreatePollForm from './CreatePollForm';

export default function EventPolls({ eventId, isOrganizer }) {
  const { user } = useAuthStore();
  const [polls, setPolls] = useState([]);

  const fetchPolls = async () => {
    try {
      const { data } = await axiosInstance.get(`/api/polls/event/${eventId}`);
      setPolls(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchPolls(); }, [eventId]);

  const handleVote = async (pollId, idx) => {
    if (!user) return alert('Đăng nhập để bình chọn');
    try {
      await axiosInstance.put(`/api/polls/${pollId}/vote`, { optionIndex: idx });
      fetchPolls();
    } catch (err) { alert(err.response?.data?.error || 'Lỗi'); }
  };

  const handleClose = async (id) => {
    try {
      await axiosInstance.put(`/api/polls/${id}/close`);
      fetchPolls();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa?')) return;
    try {
      await axiosInstance.delete(`/api/polls/${id}`);
      fetchPolls();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="event-polls">
      {isOrganizer && <CreatePollForm eventId={eventId} onCreated={fetchPolls} />}
      
      <div className="polls-list" style={{ marginTop: '2rem' }}>
        {polls.map(poll => {
          const total = poll.options.reduce((s, o) => s + o.votes.length, 0);
          const hasVoted = poll.options.some(o => o.votes.includes(user?._id));
          const showResult = hasVoted || poll.isClosed || isOrganizer;

          return (
            <div key={poll._id} className="poll-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
              <h4>{poll.question} {poll.isClosed && '🔒'}</h4>
              <div style={{ marginTop: '1rem' }}>
                {poll.options.map((opt, i) => {
                  const pct = total > 0 ? (opt.votes.length / total) * 100 : 0;
                  return (
                    <div key={i} style={{ marginBottom: '0.75rem' }}>
                      {showResult ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                            <span>{opt.text}</span>
                            <span>{opt.votes.length} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px' }}>
                            <div style={{ width: `${pct}%`, background: '#e94560', height: '100%', borderRadius: '4px' }} />
                          </div>
                        </>
                      ) : (
                        <button onClick={() => handleVote(poll._id, i)} className="btn-poll-option" style={{ width: '100%', textAlign: 'left', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'white', cursor: 'pointer' }}>
                          {opt.text}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {isOrganizer && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  {!poll.isClosed && <button onClick={() => handleClose(poll._id)} className="btn-text">Đóng</button>}
                  <button onClick={() => handleDelete(poll._id)} className="btn-text" style={{ color: '#ef4444' }}>Xóa</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
