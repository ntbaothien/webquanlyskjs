import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

export default function SeatMapPage() {
  const { eventId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const ticketType = state?.ticketType;
  
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketType) {
      navigate(`/events/${eventId}`);
      return;
    }
    // Fetch seats for this event
    const fetchSeats = async () => {
      try {
        // Fallback to mock data if API doesn't exist yet
        try {
          const { data } = await axiosInstance.get(`/events/${eventId}/seats`);
          setSeats(data.data || generateMockSeats());
        } catch (e) {
          console.warn('Seat API failed, using mock data');
          setSeats(generateMockSeats());
        }
      } catch (err) {
        setSeats(generateMockSeats());
      } finally {
        setLoading(false);
      }
    };
    fetchSeats();
  }, [eventId, ticketType, navigate]);

  // Generate a realistic 10x10 seat grid
  const generateMockSeats = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    let mock = [];
    rows.forEach(r => {
      for (let i = 1; i <= 10; i++) {
        const isBooked = Math.random() > 0.8;
        mock.push({
          _id: `${r}${i}`,
          seatNumber: `${r}${i}`,
          row: r,
          status: isBooked ? 'Booked' : 'Available',
        });
      }
    });
    return mock;
  };

  const toggleSeat = (seat) => {
    if (seat.status !== 'Available') return;
    if (selectedSeats.find(s => s._id === seat._id)) {
      setSelectedSeats(selectedSeats.filter(s => s._id !== seat._id));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const proceedToCheckout = () => {
    if (selectedSeats.length === 0) return;
    navigate(`/checkout/${eventId}`, {
      state: { ticketType, selectedSeats }
    });
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <button className="btn btn-ghost mb-24" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        
        <div className="flex-between mb-24">
          <h2>Chọn ghế ngồi</h2>
          {ticketType && (
            <div className="badge badge-purple">{ticketType.name} - {ticketType.price.toLocaleString()}đ</div>
          )}
        </div>

        <div className="card text-center mb-24" style={{ padding: '60px 20px', background: 'var(--bg-card2)', borderBottom: '4px solid var(--primary)' }}>
          <h3 style={{ letterSpacing: '8px', opacity: 0.5 }}>SÂN KHẤU</h3>
        </div>

        <div className="card mb-24" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 600, alignItems: 'center' }}>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(row => (
              <div key={row} className="flex gap-8" style={{ alignItems: 'center' }}>
                <span style={{ width: 24, fontWeight: 700, color: 'var(--text-muted)' }}>{row}</span>
                <div className="flex gap-8">
                  {seats.filter(s => s.row === row).map(seat => {
                    const isSelected = selectedSeats.some(s => s._id === seat._id);
                    let bgColor = 'var(--bg-card2)';
                    let cursor = 'pointer';
                    let opacity = 1;

                    if (seat.status === 'Booked') {
                      bgColor = 'rgba(255,101,132,0.2)';
                      cursor = 'not-allowed';
                      opacity = 0.5;
                    } else if (isSelected) {
                      bgColor = 'var(--primary)';
                    }

                    return (
                      <div 
                        key={seat._id}
                        title={`Ghế ${seat.seatNumber}`}
                        onClick={() => toggleSeat(seat)}
                        style={{
                          width: 36, height: 36, borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600,
                          background: bgColor, cursor, opacity,
                          border: isSelected ? 'none' : '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {seat.seatNumber.slice(1)}
                      </div>
                    );
                  })}
                </div>
                <span style={{ width: 24, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>{row}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-24 mt-32" style={{ justifyContent: 'center', padding: '16px', background: 'var(--bg-card2)', borderRadius: 12 }}>
            <div className="flex gap-8 items-center"><div style={{ width: 20, height: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4 }}></div> <span style={{ fontSize: 13 }}>Ghế trống</span></div>
            <div className="flex gap-8 items-center"><div style={{ width: 20, height: 20, background: 'var(--primary)', borderRadius: 4 }}></div> <span style={{ fontSize: 13 }}>Đang chọn</span></div>
            <div className="flex gap-8 items-center"><div style={{ width: 20, height: 20, background: 'rgba(255,101,132,0.2)', borderRadius: 4, opacity: 0.5 }}></div> <span style={{ fontSize: 13 }}>Đã bán</span></div>
          </div>
        </div>

        <div className="card-glass flex-between" style={{ padding: 24, position: 'sticky', bottom: 20, zIndex: 10 }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Đã chọn {selectedSeats.length} ghế</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {selectedSeats.map(s => s.seatNumber).join(', ') || 'Chưa chọn ghế'}
            </div>
          </div>
          <button 
            className="btn btn-primary btn-lg" 
            disabled={selectedSeats.length === 0}
            onClick={proceedToCheckout}
          >
            Tiếp tục thanh toán →
          </button>
        </div>

      </div>
    </div>
  );
}
