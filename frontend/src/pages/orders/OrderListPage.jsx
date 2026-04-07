import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosInstance';
import Navbar from '../../components/common/Navbar';
import '../events/Events.css';
import '../auth/Auth.css';

const DEFAULT_ZONE = { id: '', name: '', description: '', color: '#6c63ff', totalSeats: 100, price: 0 };
const ZONE_COLORS = ['#FFD700', '#4FC3F7', '#81C784', '#FF8A65', '#CE93D8', '#4DB6AC'];

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '', description: '', location: '',
    startDate: '', endDate: '', maxCapacity: 0,
    status: 'DRAFT', tagsInput: '', isFree: true
  });
  const [zones, setZones] = useState([]);
  const [bannerFile, setBannerFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapLocation, setMapLocation] = useState('');

  useEffect(() => {
    if (id) {
      axiosInstance.get(`/events/${id}`).then(({ data }) => {
        const e = data.event;
        setForm({
          title: e.title || '',
          description: e.description || '',
          location: e.location || '',
          startDate: e.startDate ? e.startDate.substring(0, 16) : '',
          endDate: e.endDate ? e.endDate.substring(0, 16) : '',
          maxCapacity: e.maxCapacity || 0,
          status: e.status || 'DRAFT',
          tagsInput: (e.tags || []).join(', '),
          isFree: e.free !== false
        });
        setMapLocation(e.location || '');
        if (e.seatZones?.length) setZones(e.seatZones);
      });
    }
  }, [id]);

  const addZone = () => {
    const idx = zones.length;
    setZones([...zones, {
      ...DEFAULT_ZONE,
      id: `zone-${Date.now()}`,
      color: ZONE_COLORS[idx % ZONE_COLORS.length]
    }]);
  };

  const updateZone = (i, field, val) => {
    const updated = [...zones];
    updated[i] = { ...updated[i], [field]: field === 'totalSeats' || field === 'price' ? Number(val) : val };
    setZones(updated);
  };

  const removeZone = (i) => setZones(zones.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.isFree && zones.length === 0) {
      setError(t('eventForm.paidNeedsZone'));
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('location', form.location);
    fd.append('startDate', form.startDate);
    fd.append('endDate', form.endDate);
    fd.append('maxCapacity', form.maxCapacity);
    fd.append('status', form.status);
    fd.append('tagsInput', form.tagsInput);
    fd.append('isFree', form.isFree);
    if (!form.isFree && zones.length > 0) {
      fd.append('zonesJson', JSON.stringify(zones));
    }
    if (bannerFile) fd.append('bannerFile', bannerFile);
    try {
      if (id) {
        await axiosInstance.put(`/organizer/events/${id}`, fd);
      } else {
        await axiosInstance.post('/organizer/events', fd);
      }
      navigate('/organizer/my-events');
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="form-card" style={{ maxWidth: 760 }}>
          <h2>{id ? t('eventForm.editTitle') : t('eventForm.createTitle')}</h2>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>{t('eventForm.titleLabel')}</label>
              <input type="text" value={form.title} onChange={f('title')}
                placeholder={t('eventForm.titlePlaceholder')} required />
            </div>

            <div className="form-group">
              <label>{t('eventForm.descLabel')}</label>
              <textarea value={form.description} onChange={f('description')}
                placeholder={t('eventForm.descPlaceholder')} required />
            </div>

            <div className="form-group">
              <label>{t('eventForm.locationLabel')} 🗺️</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" value={form.location} onChange={f('location')}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setMapLocation(form.location); } }}
                  placeholder={t('eventForm.locationPlaceholder')} required style={{ flex: 1 }} />
                <button type="button" onClick={() => setMapLocation(form.location)} style={{
                  padding: '0 1.25rem', borderRadius: '10px', background: 'rgba(108,99,255,0.15)',
                  border: '1px solid rgba(108,99,255,0.4)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600,
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}>
                  📍 Dò tọa độ
                </button>
              </div>
              {mapLocation && mapLocation.trim() !== '' && (
                <div style={{
                  marginTop: '0.75rem', borderRadius: '12px', overflow: 'hidden',
                  border: '2px solid rgba(108,99,255,0.3)', height: '240px', background: 'var(--bg-input)'
                }}>
                  <div style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(108,99,255,0.2)', color: '#a78bfa', fontWeight: 600 }}>
                    Kiểm tra vị trí trên bản đồ — Hãy sửa lại địa chỉ nếu ghim rớt sai chỗ!
                  </div>
                  <iframe
                    width="100%" height="calc(100% - 22px)" style={{ border: 0 }} loading="lazy" allowFullScreen
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapLocation)}&output=embed`}
                  ></iframe>
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('eventForm.startDate')}</label>
                <input type="datetime-local" value={form.startDate} onChange={f('startDate')} />
              </div>
              <div className="form-group">
                <label>{t('eventForm.endDate')}</label>
                <input type="datetime-local" value={form.endDate} onChange={f('endDate')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('eventForm.maxCapacity')}</label>
                <input type="number" min="0" value={form.maxCapacity} onChange={f('maxCapacity')} />
              </div>
              <div className="form-group">
                <label>{t('eventForm.statusLabel')}</label>
                <select
                  value={form.status}
                  onChange={f('status')}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: '10px',
                    backgroundColor: 'rgba(26, 26, 46, 0.8)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)', fontSize: '1rem', cursor: 'pointer'
                  }}
                >
                  <option style={{ backgroundColor: '#1a1a2e', color: '#fff' }} value="DRAFT">{t('eventForm.statusDraft')}</option>
                  <option style={{ backgroundColor: '#1a1a2e', color: '#fff' }} value="PUBLISHED">{t('eventForm.statusPublished')}</option>
                  <option style={{ backgroundColor: '#1a1a2e', color: '#fff' }} value="CANCELLED">{t('eventForm.statusCancelled')}</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{t('eventForm.tagsLabel')}</label>
              <input type="text" value={form.tagsInput} onChange={f('tagsInput')}
                placeholder="music, entertainment, tech" />
            </div>

            <div className="form-group">
              <label>{t('eventForm.bannerLabel')}</label>
              <input type="file" accept="image/*" style={{ color: 'rgba(255,255,255,0.7)' }}
                onChange={e => setBannerFile(e.target.files[0])} />
            </div>

            {/* === Free / Paid toggle === */}
            <div className="form-group" style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
              padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <label style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 700 }}>
                {t('eventForm.eventTypeLabel')}
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { val: true,  label: t('eventForm.freeLabel'), desc: t('eventForm.freeDesc') },
                  { val: false, label: t('eventForm.paidLabel'), desc: t('eventForm.paidDesc') },
                ].map(opt => (
                  <div key={String(opt.val)} onClick={() => setForm({ ...form, isFree: opt.val })}
                    style={{
                      flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${form.isFree === opt.val ? '#6c63ff' : 'rgba(255,255,255,0.1)'}`,
                      background: form.isFree === opt.val ? 'rgba(108,99,255,0.15)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: form.isFree === opt.val ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                      {opt.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* === Zone management (paid only) === */}
            {!form.isFree && (
              <div className="form-group" style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                padding: '1.25rem', border: '1px solid rgba(167,139,250,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 700, margin: 0 }}>{t('eventForm.zonesLabel')}</label>
                  <button type="button" onClick={addZone} style={{
                    padding: '0.4rem 1rem', borderRadius: '8px',
                    background: 'rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.4)',
                    color: '#a78bfa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                  }}>{t('eventForm.addZone')}</button>
                </div>

                {zones.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    {t('eventForm.noZones')}
                  </p>
                )}

                {zones.map((zone, i) => (
                  <div key={zone.id || i} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                    padding: '1rem', marginBottom: '0.75rem',
                    borderLeft: `4px solid ${zone.color}`
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>{t('eventForm.zoneName')}</label>
                        <input type="text" value={zone.name}
                          onChange={e => updateZone(i, 'name', e.target.value)}
                          placeholder={t('eventForm.namePlaceholder')} required={!form.isFree} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>{t('eventForm.zoneColor')}</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                          {ZONE_COLORS.map(c => (
                            <div key={c} onClick={() => updateZone(i, 'color', c)}
                              style={{
                                width: 24, height: 24, borderRadius: '50%', background: c,
                                cursor: 'pointer', border: zone.color === c ? '3px solid #fff' : '2px solid transparent',
                                transition: 'border 0.15s'
                              }} />
                          ))}
                        </div>
                      </div>
                      <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.8rem' }}>{t('eventForm.zoneDesc')}</label>
                        <input type="text" value={zone.description}
                          onChange={e => updateZone(i, 'description', e.target.value)}
                          placeholder={t('eventForm.zoneDescPlaceholder')} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>{t('eventForm.zoneTotalSeats')}</label>
                        <input type="number" min="1" value={zone.totalSeats}
                          onChange={e => updateZone(i, 'totalSeats', e.target.value)} required={!form.isFree} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>{t('eventForm.zonePrice')}</label>
                        <input type="number" min="0" value={zone.price}
                          onChange={e => updateZone(i, 'price', e.target.value)} required={!form.isFree} />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeZone(i)}
                      style={{
                        marginTop: '0.5rem', padding: '0.3rem 0.8rem', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem'
                      }}>{t('eventForm.removeZone')}</button>
                  </div>
                ))}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? t('eventForm.saving') : id ? t('eventForm.update') : t('eventForm.create')}
              </button>
              <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
