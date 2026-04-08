import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import './Wallet.css';

export default function MomoReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();

  const [status, setStatus] = useState('LOADING'); // LOADING | COMPLETED | REJECTED | PENDING | ERROR
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const orderId = searchParams.get('orderId');

  const checkStatus = useCallback(async () => {
    if (!orderId) {
      setStatus('ERROR');
      setError('Thiếu mã đơn hàng');
      return;
    }

    try {
      const { data: result } = await axiosInstance.get(`/payment/momo/return?orderId=${orderId}`);
      setData(result);

      if (result.status === 'COMPLETED') {
        setStatus('COMPLETED');
        // Cập nhật balance trong auth store
        if (result.balance !== undefined) {
          updateUser({ balance: result.balance });
        }
      } else if (result.status === 'REJECTED') {
        setStatus('REJECTED');
      } else if (result.status === 'PENDING') {
        setStatus('PENDING');
      } else {
        setStatus('ERROR');
      }
    } catch (err) {
      setStatus('ERROR');
      setError(err.response?.data?.error || 'Không thể kiểm tra trạng thái thanh toán');
    }
  }, [orderId, updateUser]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-retry khi PENDING (mỗi 3 giây, tối đa 10 lần)
  useEffect(() => {
    if (status !== 'PENDING' || retryCount >= 10) return;

    const timer = setTimeout(() => {
      setRetryCount(c => c + 1);
      checkStatus();
    }, 3000);

    return () => clearTimeout(timer);
  }, [status, retryCount, checkStatus]);

  const statusConfig = {
    LOADING: {
      icon: '⏳',
      title: 'Đang kiểm tra...',
      subtitle: 'Vui lòng đợi trong giây lát',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
      border: 'rgba(167,139,250,0.3)',
    },
    COMPLETED: {
      icon: '🎉',
      title: data?.type === 'SPEND' ? 'Mua vé thành công!' : 'Nạp tiền thành công!',
      subtitle: data?.type === 'SPEND'
        ? data?.message || `Đã mua vé thành công`
        : `+${data?.amount?.toLocaleString('vi-VN') || 0}đ đã được cộng vào ví`,
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.08)',
      border: 'rgba(74,222,128,0.3)',
    },
    REJECTED: {
      icon: '❌',
      title: 'Thanh toán thất bại',
      subtitle: data?.message || 'Giao dịch không thành công',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.3)',
    },
    PENDING: {
      icon: '⏳',
      title: 'Đang xử lý...',
      subtitle: `Đang chờ xác nhận từ MoMo (${retryCount}/10)`,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.08)',
      border: 'rgba(251,191,36,0.3)',
    },
    ERROR: {
      icon: '⚠️',
      title: 'Có lỗi xảy ra',
      subtitle: error || 'Không thể xử lý giao dịch',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.3)',
    },
  };

  const cfg = statusConfig[status] || statusConfig.ERROR;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="momo-return-page">
          {/* Status Card */}
          <div className="momo-return-card" style={{
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}>
            {/* Animated icon */}
            <div className={`momo-return-icon ${status === 'LOADING' || status === 'PENDING' ? 'momo-spin' : status === 'COMPLETED' ? 'momo-bounce' : ''}`}>
              {cfg.icon}
            </div>

            <h1 className="momo-return-title" style={{ color: cfg.color }}>
              {cfg.title}
            </h1>

            <p className="momo-return-subtitle">
              {cfg.subtitle}
            </p>

            {/* Amount display for completed */}
            {status === 'COMPLETED' && data && (
              <div className="momo-return-amount-box">
                <div className="momo-return-amount">
                  {data.type === 'SPEND' ? '' : '+'}{data.amount?.toLocaleString('vi-VN')}đ
                </div>
                {data.type === 'SPEND' && data.bookingMeta && (
                  <div className="momo-return-balance" style={{ marginBottom: '0.5rem' }}>
                    🎫 {data.bookingMeta.quantity} vé khu <strong>{data.bookingMeta.zoneName}</strong>
                  </div>
                )}
                {data.type === 'TOPUP' && (
                  <div className="momo-return-balance">
                    Số dư hiện tại: <strong>{data.balance?.toLocaleString('vi-VN')}đ</strong>
                  </div>
                )}
                {data.momoTransId && (
                  <div className="momo-return-txid">
                    Mã GD MoMo: <code>{data.momoTransId}</code>
                  </div>
                )}
              </div>
            )}

            {/* Amount display for rejected */}
            {status === 'REJECTED' && data && (
              <div className="momo-return-amount-box" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
                <div className="momo-return-amount" style={{ color: '#f87171' }}>
                  {data.amount?.toLocaleString('vi-VN')}đ
                </div>
                <div className="momo-return-balance" style={{ color: 'rgba(248,113,113,0.7)' }}>
                  Giao dịch không thành công
                </div>
              </div>
            )}

            {/* Pending spinner */}
            {status === 'PENDING' && (
              <div className="momo-return-pending">
                <div className="wallet-spinner" />
                <p>Tự động kiểm tra lại sau 3 giây...</p>
              </div>
            )}

            {/* Actions */}
            <div className="momo-return-actions">
              {status === 'COMPLETED' && data?.type === 'SPEND' ? (
                <>
                  <button
                    className="momo-return-btn-primary"
                    onClick={() => navigate('/my-tickets')}
                  >
                    🎫 Xem vé của tôi
                  </button>
                  <button
                    className="momo-return-btn-secondary"
                    onClick={() => navigate('/')}
                  >
                    🏠 Trang chủ
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="momo-return-btn-primary"
                    onClick={() => navigate('/wallet')}
                  >
                    💰 Về trang Ví
                  </button>
                  {(status === 'REJECTED' || status === 'ERROR') && (
                    <button
                      className="momo-return-btn-secondary"
                      onClick={() => {
                        setStatus('LOADING');
                        setRetryCount(0);
                        checkStatus();
                      }}
                    >
                      🔄 Kiểm tra lại
                    </button>
                  )}
                  <button
                    className="momo-return-btn-secondary"
                    onClick={() => navigate('/')}
                  >
                    🏠 Trang chủ
                  </button>
                </>
              )}
            </div>
          </div>

          {/* MoMo branding */}
          <div className="momo-return-footer">
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
              Thanh toán qua
            </span>
            <span style={{
              color: '#ae2070',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '0.5px'
            }}>
              MoMo
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
