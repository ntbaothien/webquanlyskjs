import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../../utils/axiosInstance';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/common/Navbar';
import { toast } from '../../components/common/Toast';
import './Wallet.css';

// ── Fake bank transfer info ──────────────────────────────────────────────────
const BANK_INFO = {
  bankName:  'MB Bank',
  accountNo: '0349123456789',
  accountName: 'EVENTHUB PLATFORM',
};

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

// ── Status config ────────────────────────────────────────────────────────────
const TX_STATUS = {
  PENDING:   { label: 'Chờ xác nhận', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', icon: '⏳' },
  COMPLETED: { label: 'Thành công',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: '✅' },
  REJECTED:  { label: 'Từ chối',       color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '❌' },
};

const TX_TYPE = {
  TOPUP:  { label: 'Nạp tiền',  color: '#4ade80',  sign: '+' },
  SPEND:  { label: 'Thanh toán', color: '#f87171',  sign: '-' },
  REFUND: { label: 'Hoàn tiền',  color: '#60a5fa',  sign: '+' },
};

function StatusChip({ status }) {
  const s = TX_STATUS[status] || TX_STATUS.PENDING;
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '6px', color: s.color, background: s.bg }}>
      {s.icon} {s.label}
    </span>
  );
}

// ── Payment instruction modal ────────────────────────────────────────────────
function PaymentModal({ transaction, onClose, onConfirm }) {
  const qrData = `${BANK_INFO.bankName}|${BANK_INFO.accountNo}|${transaction.amount}|${transaction.transferCode}`;

  return (
    <div className="wallet-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={e => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <div>
            <h3>💳 Hướng dẫn chuyển khoản</h3>
            <p>Mã giao dịch: <strong style={{ color: '#a78bfa' }}>{transaction.transferCode}</strong></p>
          </div>
          <button className="wallet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="wallet-payment-grid">
          {/* QR Code */}
          <div className="wallet-qr-box">
            <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
              <QRCodeSVG value={qrData} size={160} level="M" />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.5rem' }}>Quét QR để chuyển khoản</p>
          </div>

          {/* Bank info */}
          <div className="wallet-bank-info">
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">Ngân hàng</span>
              <strong>{BANK_INFO.bankName}</strong>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">Số tài khoản</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>{BANK_INFO.accountNo}</strong>
                <button className="wallet-copy-btn"
                  onClick={() => { navigator.clipboard.writeText(BANK_INFO.accountNo); toast('Đã copy số tài khoản!', 'success'); }}>
                  📋
                </button>
              </div>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">Chủ tài khoản</span>
              <strong>{BANK_INFO.accountName}</strong>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">Số tiền</span>
              <strong style={{ color: '#fbbf24', fontSize: '1.2rem' }}>
                {transaction.amount.toLocaleString('vi-VN')}đ
              </strong>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">Nội dung CK</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ color: '#a78bfa' }}>{transaction.transferCode}</strong>
                <button className="wallet-copy-btn"
                  onClick={() => { navigator.clipboard.writeText(transaction.transferCode); toast('Đã copy nội dung!', 'success'); }}>
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="wallet-payment-note">
          ⚠️ Vui lòng nhập đúng <strong>nội dung chuyển khoản</strong> để hệ thống xác nhận tự động.
          Số dư sẽ được cộng sau khi admin xác nhận (thường trong vòng 5–15 phút).
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="wallet-btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Đóng
          </button>
          <button className="wallet-btn-primary" onClick={onConfirm} style={{ flex: 2 }}>
            ✅ Tôi đã chuyển khoản xong
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Wallet Page ─────────────────────────────────────────────────────────
export default function WalletPage() {
  const { user, updateUser } = useAuthStore();

  const [balance, setBalance]           = useState(user?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage]                 = useState(0);
  const [txFilter, setTxFilter]         = useState('');  // '' | TOPUP | SPEND
  const [loading, setLoading]           = useState(true);

  const [amount, setAmount]             = useState('');
  const [customMode, setCustomMode]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [pendingTx, setPendingTx]       = useState(null);  // tx waiting for payment modal
  const [showPayModal, setShowPayModal] = useState(false);

  const loadTransactions = useCallback(async (p = 0, type = txFilter) => {
    setLoading(true);
    try {
      const params = { page: p, size: 8 };
      if (type) params.type = type;
      const { data } = await axiosInstance.get('/users/me/transactions', { params });
      setTransactions(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
      setBalance(data.balance);
      // Sync balance in auth store
      updateUser({ balance: data.balance });
    } catch {}
    finally { setLoading(false); }
  }, [txFilter, updateUser]);

  useEffect(() => { loadTransactions(0, ''); }, []);

  const handlePreset = (val) => {
    setAmount(String(val));
    setCustomMode(false);
  };

  const handleTopup = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10000) { toast('Số tiền tối thiểu 10,000đ', 'error'); return; }
    setSubmitting(true);
    try {
      const { data } = await axiosInstance.post('/users/me/topup', { amount: amt });
      setPendingTx(data.transaction);
      setShowPayModal(true);
      setAmount('');
    } catch (err) {
      toast(err.response?.data?.error || 'Tạo yêu cầu thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentConfirmed = () => {
    setShowPayModal(false);
    setPendingTx(null);
    toast('Yêu cầu đã ghi nhận! Admin sẽ xác nhận sớm nhất.', 'success');
    loadTransactions(0, txFilter);
  };

  const handleFilterChange = (f) => {
    setTxFilter(f);
    setPage(0);
    loadTransactions(0, f);
  };

  const handlePageChange = (p) => {
    setPage(p);
    loadTransactions(p, txFilter);
  };

  const pendingTopups = transactions.filter(t => t.type === 'TOPUP' && t.status === 'PENDING').length;

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="wallet-page">

          {/* ── Top section ── */}
          <div className="wallet-top">

            {/* Balance card */}
            <div className="wallet-balance-card">
              <div className="wallet-balance-label">Số dư ví</div>
              <div className="wallet-balance-amount">
                {balance.toLocaleString('vi-VN')}
                <span className="wallet-currency">đ</span>
              </div>
              <div className="wallet-balance-sub">
                {user?.fullName} · {user?.email}
              </div>
              {pendingTopups > 0 && (
                <div className="wallet-pending-note">
                  ⏳ {pendingTopups} yêu cầu nạp đang chờ xác nhận
                </div>
              )}
            </div>

            {/* Top-up form */}
            <div className="wallet-topup-card">
              <h3 className="wallet-section-title">💳 Nạp tiền vào ví</h3>

              {/* Preset amounts */}
              <div className="wallet-preset-grid">
                {PRESET_AMOUNTS.map(p => (
                  <button key={p}
                    className={`wallet-preset-btn ${amount === String(p) && !customMode ? 'active' : ''}`}
                    onClick={() => handlePreset(p)}>
                    {p >= 1000000
                      ? `${p / 1000000}M`
                      : `${p / 1000}k`}đ
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <button className={`wallet-custom-toggle ${customMode ? 'active' : ''}`}
                onClick={() => { setCustomMode(v => !v); if (!customMode) setAmount(''); }}>
                {customMode ? '✕ Bỏ nhập thủ công' : '✏️ Nhập số tiền khác'}
              </button>

              {customMode && (
                <div className="wallet-custom-input-wrap">
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    placeholder="Nhập số tiền (tối thiểu 10,000đ)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="wallet-custom-input"
                  />
                  {amount && Number(amount) >= 10000 && (
                    <span className="wallet-amount-preview">
                      = {Number(amount).toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              )}

              <button
                className="wallet-topup-btn"
                onClick={handleTopup}
                disabled={!amount || Number(amount) < 10000 || submitting}>
                {submitting ? '⏳ Đang xử lý...' : `💳 Nạp ${amount ? Number(amount).toLocaleString('vi-VN') + 'đ' : 'tiền'}`}
              </button>

              <div className="wallet-info-list">
                <div>✅ Hỗ trợ chuyển khoản ngân hàng</div>
                <div>⚡ Xác nhận trong 5–15 phút</div>
                <div>🔒 Giao dịch bảo mật</div>
              </div>
            </div>
          </div>

          {/* ── Transaction history ── */}
          <div className="wallet-history-card">
            <div className="wallet-history-header">
              <div>
                <h3 className="wallet-section-title" style={{ margin: 0 }}>📋 Lịch sử giao dịch</h3>
                {!loading && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{totalElements} giao dịch</span>}
              </div>
              <div className="wallet-filter-tabs">
                {[['', 'Tất cả'], ['TOPUP', 'Nạp tiền'], ['SPEND', 'Thanh toán'], ['REFUND', 'Hoàn tiền']].map(([v, l]) => (
                  <button key={v} className={`wallet-filter-tab ${txFilter === v ? 'active' : ''}`}
                    onClick={() => handleFilterChange(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div className="wallet-spinner" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="wallet-empty">
                <span>💸</span>
                <p>Chưa có giao dịch nào{txFilter ? ` (${txFilter === 'TOPUP' ? 'Nạp tiền' : txFilter === 'SPEND' ? 'Thanh toán' : 'Hoàn tiền'})` : ''}</p>
              </div>
            ) : (
              <div className="wallet-tx-list">
                {transactions.map(tx => {
                  const typeInfo = TX_TYPE[tx.type] || TX_TYPE.TOPUP;
                  return (
                    <div key={tx._id} className="wallet-tx-item">
                      <div className={`wallet-tx-icon ${tx.type.toLowerCase()}`}>
                        {tx.type === 'TOPUP' ? '⬆️' : tx.type === 'REFUND' ? '🔄' : '⬇️'}
                      </div>
                      <div className="wallet-tx-info">
                        <div className="wallet-tx-title">
                          {typeInfo.label}
                          {tx.transferCode && (
                            <span className="wallet-tx-code">{tx.transferCode}</span>
                          )}
                        </div>
                        <div className="wallet-tx-date">
                          {new Date(tx.createdAt).toLocaleString('vi-VN')}
                          {tx.note && <span> · {tx.note}</span>}
                        </div>
                        {tx.status === 'REJECTED' && tx.adminNote && (
                          <div className="wallet-tx-admin-note">Lý do: {tx.adminNote}</div>
                        )}
                      </div>
                      <div className="wallet-tx-right">
                        <div className="wallet-tx-amount" style={{ color: typeInfo.color }}>
                          {typeInfo.sign}{tx.amount.toLocaleString('vi-VN')}đ
                        </div>
                        <StatusChip status={tx.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="wallet-pagination">
                <button disabled={page === 0} onClick={() => handlePageChange(page - 1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const p = start + i;
                  return (
                    <button key={p} className={p === page ? 'active' : ''} onClick={() => handlePageChange(p)}>
                      {p + 1}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages - 1} onClick={() => handlePageChange(page + 1)}>›</button>
              </div>
            )}
          </div>

          {/* Note about usage */}
          <div className="wallet-usage-note">
            <strong>💡 Cách sử dụng số dư:</strong> Số dư ví được dùng để thanh toán vé tại trang chi tiết sự kiện.
            Bạn không thể rút tiền về tài khoản ngân hàng — vui lòng nạp đúng số tiền cần dùng.
            <Link to="/" style={{ color: '#a78bfa', marginLeft: '0.5rem' }}>Xem sự kiện →</Link>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && pendingTx && (
        <PaymentModal
          transaction={pendingTx}
          onClose={() => { setShowPayModal(false); loadTransactions(0, txFilter); }}
          onConfirm={handlePaymentConfirmed}
        />
      )}
    </>
  );
}
