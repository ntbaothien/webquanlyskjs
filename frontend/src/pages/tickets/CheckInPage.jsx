import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';

export default function CheckInPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [history, setHistory] = useState([]);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    if (!scannerInstanceRef.current) {
      scannerInstanceRef.current = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      });
      scannerInstanceRef.current.render(onScanSuccess, onScanError);
    }
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const onScanSuccess = (decodedText) => {
    const code = decodedText.replace('EVENTHUB:', '').trim();
    if (code) processCheckIn(code);
  };

  const onScanError = () => {};

  const processCheckIn = async (code) => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await axiosInstance.post(`/tickets/${code}/check-in`);
      setResult({ success: true, message: data.message, ticket: data.ticket });
      setHistory(prev => [{
        code, time: new Date().toLocaleTimeString(locale),
        name: data.ticket?.userFullName, event: data.ticket?.eventTitle,
        status: 'success'
      }, ...prev]);
    } catch (err) {
      const errMsg = err.response?.data?.error || t('checkin.failed');
      setResult({ success: false, message: errMsg });
      setHistory(prev => [{
        code, time: new Date().toLocaleTimeString(locale),
        name: '—', event: '—', status: 'error', message: errMsg
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processCheckIn(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 className="page-title">{t('checkin.title')}</h1>

        {/* Result banner */}
        {result && (
          <div className={`checkin-result ${result.success ? 'checkin-success' : 'checkin-error'}`}
            style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="checkin-result-icon">{result.success ? '✅' : '❌'}</div>
            <div>
              <div className="checkin-result-msg">{result.message}</div>
              {result.ticket && (
                <div className="checkin-result-detail">
                  👤 {result.ticket.userFullName} • 🎪 {result.ticket.eventTitle} • 🪑 {result.ticket.zoneName}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          {/* QR Scanner */}
          <div className="checkin-scanner-card">
            <h3 style={{ marginBottom: '1rem' }}>{t('checkin.scanTitle')}</h3>
            <div id="qr-reader" style={{ borderRadius: '12px', overflow: 'hidden' }} ref={scannerRef} />
          </div>

          {/* Manual input */}
          <div>
            <div className="checkin-scanner-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>{t('checkin.manualTitle')}</h3>
              <form onSubmit={handleManual} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.toUpperCase())}
                  placeholder={t('checkin.manualPlaceholder')}
                  className="checkin-manual-input"
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '1rem' }}
                />
                <button type="submit" className="btn-register" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
                  disabled={loading}>
                  {loading ? '⏳' : t('checkin.checkinBtn')}
                </button>
              </form>
            </div>

            {/* Stats */}
            <div className="checkin-scanner-card">
              <h3>{t('checkin.statsTitle')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(76,175,80,0.1)', borderRadius: '10px', border: '1px solid rgba(76,175,80,0.2)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>
                    {history.filter(h => h.status === 'success').length}
                  </div>
                  <div className="checkin-stat-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('checkin.success')}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>
                    {history.filter(h => h.status === 'error').length}
                  </div>
                  <div className="checkin-stat-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('checkin.errors')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{t('checkin.historyTitle')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.map((h, i) => (
                <div key={i} className="checkin-history-item" style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.75rem 1rem', borderRadius: '8px',
                  background: h.status === 'success' ? 'rgba(76,175,80,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${h.status === 'success' ? 'rgba(76,175,80,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{h.status === 'success' ? '✅' : '❌'}</span>
                  <div style={{ flex: 1 }}>
                    <div className="checkin-history-code" style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{h.code}</div>
                    <div className="checkin-history-meta" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {h.name} • {h.event} {h.message ? `• ${h.message}` : ''}
                    </div>
                  </div>
                  <span className="checkin-history-time" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
