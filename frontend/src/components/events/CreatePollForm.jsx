import { useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';

export default function CreatePollForm({ eventId, onPollCreated }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validOptions = options.map(o => o.trim()).filter(o => o !== '');
    if (validOptions.length < 2) {
      setError('Vui lòng nhập ít nhất 2 lựa chọn');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/polls', {
        eventId,
        question,
        options: validOptions
      });
      setQuestion('');
      setOptions(['', '']);
      if (onPollCreated) onPollCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi tạo bình chọn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-poll-form" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
      <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>📊 Tạo cuộc bình chọn mới</h4>
      {error && <div className="msg-box error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Câu hỏi:</label>
          <input
            type="text"
            required
            placeholder="Bạn muốn hỏi gì?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Các lựa chọn:</label>
          {options.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                required
                placeholder={`Lựa chọn ${idx + 1}`}
                value={opt}
                onChange={e => handleOptionChange(idx, e.target.value)}
                style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => handleRemoveOption(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
              )}
            </div>
          ))}
          {options.length < 5 && (
            <button type="button" onClick={handleAddOption} className="btn-text" style={{ fontSize: '0.85rem' }}>+ Thêm lựa chọn</button>
          )}
        </div>
        <button type="submit" className="btn-register" disabled={loading} style={{ width: 'auto', padding: '0.65rem 1.5rem' }}>
          {loading ? 'Đang tạo...' : 'Tạo bình chọn'}
        </button>
      </form>
    </div>
  );
}
