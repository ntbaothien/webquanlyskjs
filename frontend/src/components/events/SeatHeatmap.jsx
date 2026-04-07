import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';

/**
 * SeatHeatmap — Hiển thị heatmap "độ nóng" cho từng seatZone
 * Props: eventId (required)
 */
export default function SeatHeatmap({ eventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredZone, setHoveredZone] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    axiosInstance.get(`/organizer/events/${eventId}/heatmap`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔥</div>
      Đang tải heatmap...
    </div>
  );

  if (!data || !data.heatmap) return null;

  const { heatmap, summary } = data;
  const maxHeat = Math.max(...heatmap.map(z => z.heat), 0.01);

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(234,179,8,0.06))',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
      }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '1rem' }}>
            🔥 Heatmap Sơ Đồ Ghế
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Độ nóng = (đã bán + đang giữ) / tổng ghế
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
          {[
            { color: '#22c55e', label: 'Còn nhiều (0–20%)' },
            { color: '#eab308', label: 'Bình thường (20–60%)' },
            { color: '#ef4444', label: 'Rất hot (80%+)' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color }} />
              <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'Tổng khu vực', value: summary.totalZones },
          { label: 'Độ nóng TB', value: `${(summary.avgHeat * 100).toFixed(0)}%` },
          { label: 'Khu hot (≥60%)', value: summary.hotZones, highlight: summary.hotZones > 0 },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '0.85rem 1rem', textAlign: 'center',
            borderRight: '1px solid var(--border)'
          }}>
            <div style={{
              fontWeight: 800, fontSize: '1.4rem',
              color: stat.highlight ? '#ef4444' : 'var(--text-primary)'
            }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap Bars */}
      <div style={{ padding: '1.5rem' }}>
        {heatmap.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Sự kiện này không có khu vực ghế
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {heatmap
              .sort((a, b) => b.heat - a.heat) // Sort by hottest first
              .map(zone => (
                <div
                  key={zone.zoneId}
                  onMouseEnter={() => setHoveredZone(zone.zoneId)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: zone.heatColor }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{zone.zoneName}</span>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                        background: `${zone.heatColor}20`, color: zone.heatColor
                      }}>{zone.heatLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>🎟️ {zone.soldSeats}/{zone.totalSeats}</span>
                      {zone.holdingSeats > 0 && <span style={{ color: '#eab308' }}>⏳ {zone.holdingSeats} đang giữ</span>}
                      <span style={{ color: '#22c55e' }}>✅ {zone.availableSeats} còn</span>
                    </div>
                  </div>

                  {/* Heat Bar */}
                  <div style={{
                    height: '28px', background: 'var(--bg-input)', borderRadius: '6px',
                    overflow: 'hidden', position: 'relative',
                    transform: hoveredZone === zone.zoneId ? 'scaleY(1.1)' : 'scaleY(1)',
                    transition: 'transform 0.15s'
                  }}>
                    {/* Sold seats */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${(zone.soldSeats / zone.totalSeats) * 100}%`,
                      background: zone.heatColor,
                      transition: 'width 0.8s ease',
                    }} />
                    {/* Holding seats */}
                    {zone.holdingSeats > 0 && (
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${(zone.soldSeats / zone.totalSeats) * 100}%`,
                        width: `${(zone.holdingSeats / zone.totalSeats) * 100}%`,
                        background: '#eab308',
                        opacity: 0.7,
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px)',
                        transition: 'all 0.8s ease'
                      }} />
                    )}
                    {/* Heat % label */}
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      paddingRight: '0.6rem', fontWeight: 700, fontSize: '0.78rem',
                      color: zone.heat > 0.5 ? '#fff' : 'var(--text-secondary)'
                    }}>
                      {(zone.heat * 100).toFixed(0)}%
                    </div>
                  </div>

                  {/* Hover detail */}
                  {hoveredZone === zone.zoneId && (
                    <div style={{
                      marginTop: '0.4rem', padding: '0.6rem 0.85rem', borderRadius: '8px',
                      background: 'var(--bg-input)', fontSize: '0.78rem',
                      display: 'flex', gap: '1.25rem', flexWrap: 'wrap'
                    }}>
                      <span>💰 Giá: <strong>{zone.price?.toLocaleString('vi-VN')}đ</strong></span>
                      <span>📊 Lấp đầy: <strong>{(zone.heat * 100).toFixed(1)}%</strong></span>
                      <span>🏷️ Màu khu: <strong style={{ color: zone.color }}>{zone.color}</strong></span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
