import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

const defaultLocation = { lat: 21.0285, lng: 105.8542 }; // Hanoi

export default function EventMapPage() {
  const [events, setEvents] = useState([]);
  const [location, setLocation] = useState(defaultLocation);
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn('Could not get actual location, using default.')
      );
    }
  }, []);

  useEffect(() => {
    fetchNearbyEvents();
  }, [location, radius]);

  const fetchNearbyEvents = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/events/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}`);
      setEvents(data.data || []);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => alert('Không thể lấy vị trí hiện tại.')
      );
    }
  };

  // Generate bounding box for map iframe
  const d = radius / 111.32; // rough lat/lng degree conversion
  const bbox = `${location.lng - d},${location.lat - d},${location.lng + d},${location.lat + d}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lng}`;

  return (
    <div className="page" style={{ paddingBottom: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', flex: 1, height: '100%', overflow: 'hidden' }}>
        
        {/* Left Sidebar - Event List */}
        <div style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
            <h2 className="mb-16">📍 Sự kiện quanh đây</h2>
            <div className="flex gap-12 mb-16">
              <button className="btn btn-secondary w-full" onClick={handleSearchCurrentLocation}>
                🎯 Vị trí của tôi
              </button>
            </div>
            <div className="form-group">
              <label className="form-label flex-between">
                <span>Bán kính tìm kiếm</span>
                <span style={{ color: 'var(--primary-light)' }}>{radius} km</span>
              </label>
              <input 
                type="range" min="1" max="50" value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))} 
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {loading ? (
              <div className="loading-center"><div className="spinner spinner-sm" /></div>
            ) : events.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '40px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏜</div>
                <p>Không có sự kiện nào trong bán kính {radius}km</p>
              </div>
            ) : (
              <div className="flex-col gap-16">
                <p className="text-muted" style={{ fontSize: 13 }}>Tìm thấy {events.length} sự kiện</p>
                {events.map(ev => (
                  <div key={ev._id} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate(`/events/${ev._id}`)}>
                    <div className="flex gap-12">
                      {ev.images?.[0] ? (
                        <img src={ev.images[0]} alt={ev.title} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                      ) : (
                        <div style={{ width: 60, height: 60, background: 'var(--bg-card2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎟</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{ev.title}</div>
                        <div className="text-muted truncate" style={{ fontSize: 12 }}>{ev.location}</div>
                        <div style={{ fontSize: 12, color: 'var(--primary-light)', marginTop: 4, fontWeight: 600 }}>
                          {new Date(ev.startTime).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Map Iframe */}
        <div style={{ position: 'relative', height: '100%', background: '#e5e5e5' }}>
          <iframe 
            width="100%" 
            height="100%" 
            src={mapSrc} 
            style={{ border: 'none' }}
            title="Sự kiện quanh đây"
          />
          <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 20, fontSize: 11, boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
            Dữ liệu bản đồ © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>OpenStreetMap</a> contributors
          </div>
        </div>
      </div>
    </div>
  );
}
