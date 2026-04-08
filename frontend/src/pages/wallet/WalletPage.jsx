import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
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
const TX_STATUS_CONFIG = {
  PENDING:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', icon: '⏳' },
  COMPLETED: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: '✅' },
  REJECTED:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '❌' },
};

const TX_TYPE_CONFIG = {
  TOPUP:  { color: '#4ade80',  sign: '+' },
  SPEND:  { color: '#f87171',  sign: '-' },
  REFUND: { color: '#60a5fa',  sign: '+' },
};

function StatusChip({ status }) {
  const { t } = useTranslation();
  const s = TX_STATUS_CONFIG[status] || TX_STATUS_CONFIG.PENDING;
  const labelKey = status === 'PENDING' ? 'wallet.statusPending' : status === 'COMPLETED' ? 'wallet.statusCompleted' : 'wallet.statusRejected';
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '6px', color: s.color, background: s.bg }}>
      {s.icon} {t(labelKey)}
    </span>
  );
}

// ── Payment instruction modal ────────────────────────────────────────────────
function PaymentModal({ transaction, onClose, onConfirm }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const qrData = `${BANK_INFO.bankName}|${BANK_INFO.accountNo}|${transaction.amount}|${transaction.transferCode}`;

  return (
    <div className="wallet-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={e => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <div>
            <h3>{t('wallet.transferTitle')}</h3>
            <p>Mã giao dịch: <strong style={{ color: '#a78bfa' }}>{transaction.transferCode}</strong></p>
          </div>
          <button className="wallet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="wallet-payment-grid">
          <div className="wallet-qr-box">
            <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block' }}>
              <QRCodeSVG value={qrData} size={160} level="M" />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{t('wallet.scanQR')}</p>
          </div>

          <div className="wallet-bank-info">
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">{t('wallet.bank')}</span>
              <strong>{BANK_INFO.bankName}</strong>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">{t('wallet.accountNo')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>{BANK_INFO.accountNo}</strong>
                <button className="wallet-copy-btn"
                  onClick={() => { navigator.clipboard.writeText(BANK_INFO.accountNo); toast(t('wallet.typeCopied'), 'success'); }}>
                  📋
                </button>
              </div>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">{t('wallet.accountName')}</span>
              <strong>{BANK_INFO.accountName}</strong>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">{t('wallet.amount')}</span>
              <strong style={{ color: '#fbbf24', fontSize: '1.2rem' }}>
                {transaction.amount.toLocaleString(locale)}đ
              </strong>
            </div>
            <div className="wallet-bank-row">
              <span className="wallet-bank-label">{t('wallet.transferContent')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ color: '#a78bfa' }}>{transaction.transferCode}</strong>
                <button className="wallet-copy-btn"
                  onClick={() => { navigator.clipboard.writeText(transaction.transferCode); toast(t('wallet.contentCopied'), 'success'); }}>
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="wallet-payment-note" dangerouslySetInnerHTML={{ __html: t('wallet.transferNote') }} />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="wallet-btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            {t('wallet.close')}
          </button>
          <button className="wallet-btn-primary" onClick={onConfirm} style={{ flex: 2 }}>
            {t('wallet.confirmed')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Wallet Page ─────────────────────────────────────────────────────────
export default function WalletPage() {
  const { user, updateUser } = useAuthStore();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

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

  const handleMomoTopup = async () => {
    const amt = Number(amount);
    if (!amt || amt < 1000) { toast('Số tiền tối thiểu qua MoMo là 1.000đ', 'error'); return; }
    if (amt > 50000000) { toast('Số tiền tối đa qua MoMo là 50.000.000đ', 'error'); return; }
    setSubmitting(true);
    try {
      const { data } = await axiosInstance.post('/payment/momo/create', { amount: amt });
      if (data.payUrl) {
        // Redirect sang trang thanh toán MoMo
        window.location.href = data.payUrl;
      } else {
        toast('Không nhận được link thanh toán từ MoMo', 'error');
      }
    } catch (err) {
      toast(err.response?.data?.error || 'Lỗi tạo thanh toán MoMo', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentConfirmed = () => {
    setShowPayModal(false);
    setPendingTx(null);
    toast(t('wallet.requestRecorded'), 'success');
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
              <div className="wallet-balance-label">{t('wallet.balance')}</div>
              <div className="wallet-balance-amount">
                {balance.toLocaleString(locale)}
                <span className="wallet-currency">đ</span>
              </div>
              <div className="wallet-balance-sub">
                {user?.fullName} · {user?.email}
              </div>
              {pendingTopups > 0 && (
                <div className="wallet-pending-note">
                  {t('wallet.pendingTopups', { count: pendingTopups })}
                </div>
              )}
            </div>

            {/* Top-up form */}
            <div className="wallet-topup-card">
              <h3 className="wallet-section-title">{t('wallet.topupTitle')}</h3>

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
                {customMode ? t('wallet.customToggleOff') : t('wallet.customToggle')}
              </button>

              {customMode && (
                <div className="wallet-custom-input-wrap">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    placeholder="Từ 1.000đ"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="wallet-custom-input"
                  />
                  {amount && Number(amount) >= 1000 && (
                    <span className="wallet-amount-preview">
                      = {Number(amount).toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              )}

              <button
                className="wallet-topup-btn wallet-momo-btn"
                onClick={handleMomoTopup}
                disabled={!amount || Number(amount) < 1000 || submitting}>
                {submitting ? '⏳ Đang xử lý...' : (
                  <>
                    <span className="momo-btn-logo">MoMo</span>
                    {` Nạp qua MoMo${amount && Number(amount) >= 1000 ? ` ${Number(amount).toLocaleString(locale)}đ` : ''}`}
                  </>
                )}
              </button>

              <div className="wallet-info-list">
                <div>✅ Thanh toán tức thì qua ví MoMo</div>
                <div>⚡ Xác nhận tự động, cộng tiền ngay</div>
                <div>🔒 Bảo mật bởi MoMo</div>
                <div>📱 Hỗ trợ QR Code và ứng dụng MoMo</div>
              </div>
            </div>
          </div>

          {/* ── Transaction history ── */}
          <div className="wallet-history-card">
            <div className="wallet-history-header">
              <div>
                <h3 className="wallet-section-title" style={{ margin: 0 }}>{t('wallet.historyTitle')}</h3>
                {!loading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalElements} {t('wallet.transactions')}</span>}
              </div>
              <div className="wallet-filter-tabs">
                {[['', t('wallet.filterAll')], ['TOPUP', t('wallet.filterTopup')], ['SPEND', t('wallet.filterSpend')], ['REFUND', t('wallet.filterRefund')]].map(([v, l]) => (
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
                <p>{t('wallet.noTransactions')}{txFilter ? ` (${txFilter === 'TOPUP' ? t('wallet.filterTopup') : txFilter === 'SPEND' ? t('wallet.filterSpend') : t('wallet.filterRefund')})` : ''}</p>
              </div>
            ) : (
              <div className="wallet-tx-list">
                {transactions.map(tx => {
                  const typeInfo = TX_TYPE_CONFIG[tx.type] || TX_TYPE_CONFIG.TOPUP;
                  const typeLabel = tx.type === 'TOPUP' ? t('wallet.filterTopup') : tx.type === 'SPEND' ? t('wallet.filterSpend') : t('wallet.filterRefund');
                  return (
                    <div key={tx._id} className="wallet-tx-item">
                      <div className={`wallet-tx-icon ${tx.type.toLowerCase()}`}>
                        {tx.type === 'TOPUP' ? '⬆️' : tx.type === 'REFUND' ? '🔄' : '⬇️'}
                      </div>
                      <div className="wallet-tx-info">
                        <div className="wallet-tx-title">
                          {typeLabel}
                          {tx.method === 'MOMO' && (
                            <span className="wallet-tx-momo-badge">MoMo</span>
                          )}
                          {tx.transferCode && tx.method !== 'MOMO' && (
                            <span className="wallet-tx-code">{tx.transferCode}</span>
                          )}
                        </div>
                        <div className="wallet-tx-date">
                          {new Date(tx.createdAt).toLocaleString(locale)}
                          {tx.note && <span> · {tx.note}</span>}
                        </div>
                        {tx.status === 'REJECTED' && tx.adminNote && (
                          <div className="wallet-tx-admin-note">Lý do: {tx.adminNote}</div>
                        )}
                      </div>
                      <div className="wallet-tx-right">
                        <div className="wallet-tx-amount" style={{ color: typeInfo.color }}>
                          {typeInfo.sign}{tx.amount.toLocaleString(locale)}đ
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
            <span dangerouslySetInnerHTML={{ __html: t('wallet.usageNote') }} />
            <Link to="/" style={{ color: 'var(--purple)', marginLeft: '0.5rem' }}>{t('wallet.viewEvents')}</Link>
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
