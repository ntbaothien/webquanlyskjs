import { useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';

export default function CreatePollForm({ eventId, onCreated }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const opts = options.filter(o => o.trim());
    if (opts.length < 2) return alert('Ít nhất 2 lựa chọn');
    try {
      await axiosInstance.post('/api/polls', { eventId, question, options: opts });
      setQuestion('');
      setOptions(['', '']);
      onCreated();
    } catch (err) { alert('Hệ thống bận'); }
  };

  return (
    <div className="create-poll-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <h4>📊 Tạo bình chọn mới</h4>
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <input value={question} onChange={e => setQuestion(e.target.value)} required placeholder="Câu hỏi..." 
          style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-input)', color: 'white', border: '1px solid var(--border)', borderRadius: '8px' }} />
        <div style={{ marginTop: '1rem' }}>
          {options.map((opt, i) => (
            <input key={i} value={opt} onChange={e => {
              const nos = [...options]; nos[i] = e.target.value; setOptions(nos);
            }} placeholder={`Lựa chọn ${i+1}`} 
              style={{ width: 'calc(100% - 10px)', padding: '0.5rem', background: 'var(--bg-input)', color: 'white', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '0.5rem' }} />
          ))}
          {options.length < 5 && <button type="button" onClick={() => setOptions([...options, ''])} className="btn-text">+ Thêm lựa chọn</button>}
        </div>
        <button type="submit" className="btn-register" style={{ marginTop: '1rem' }}>Tạo bình chọn</button>
      </form>
    </div>
  );
}
