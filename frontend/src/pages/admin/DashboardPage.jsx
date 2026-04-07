import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import AdminLayout from '../../components/admin/AdminLayout';
import useThemeStore from '../../store/themeStore';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './Admin.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler
);

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const { theme } = useThemeStore();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  // Theme-aware chart colors
  const chartTooltip = {
    backgroundColor: isLight ? 'rgba(255,255,255,0.98)' : '#1a1a2e',
    borderColor:     isLight ? 'rgba(0,0,0,0.1)'         : 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    titleColor: isLight ? 'rgba(0,0,0,0.88)'  : '#fff',
    bodyColor:  isLight ? 'rgba(0,0,0,0.65)'  : 'rgba(255,255,255,0.8)',
    padding: 10, cornerRadius: 8,
  };
  const chartGridColor  = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.04)';
  const chartTickColor  = isLight ? 'rgba(0,0,0,0.45)'  : 'rgba(255,255,255,0.4)';
  const legendLabelColor = isLight ? 'rgba(0,0,0,0.6)'  : 'rgba(255,255,255,0.7)';

  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosInstance.get('/admin/dashboard'),
      axiosInstance.get('/admin/revenue'),
      axiosInstance.get('/admin/reports'),
    ]).then(([statsRes, revRes, reportRes]) => {
      setStats(statsRes.data);
      setRevenue(revRes.data);
      setReport(reportRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title={`📊 ${t('admin.dashboard')}`} subtitle={t('admin.dashboardSub')}>
        <div className="admin-loading">⏳ {t('common.loading')}</div>
      </AdminLayout>
    );
  }

  const statCards = [
    { icon: '📅', value: stats?.totalEvents ?? 0,         label: t('admin.totalEvents'), onClick: () => navigate('/admin/events') },
    { icon: '✅', value: stats?.publishedEvents ?? 0,     label: t('admin.published'), onClick: () => navigate('/admin/events?status=PUBLISHED') },
    { icon: '⏳', value: stats?.pendingApprovalCount ?? 0, label: 'Chờ phê duyệt', onClick: () => navigate('/admin/events?status=PENDING_APPROVAL'), accent: stats?.pendingApprovalCount > 0 ? '#f59e0b' : undefined },
    { icon: '👥', value: stats?.totalUsers ?? 0,          label: t('admin.users'), onClick: () => navigate('/admin/users') },
    { icon: '🎟️', value: stats?.totalRegistrations ?? 0, label: t('admin.registrations') },
  ];

  // Chart: Events by month
  const monthLabels = report?.eventsByMonth ? Object.keys(report.eventsByMonth) : [];
  const monthData = report?.eventsByMonth ? Object.values(report.eventsByMonth) : [];

  const barChartData = {
    labels: monthLabels,
    datasets: [{
      label: t('admin.events'),
      data: monthData,
      backgroundColor: 'rgba(233, 69, 96, 0.6)',
      borderColor: '#e94560',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: chartTooltip,
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: { color: chartTickColor, font: { size: 11 } }
      },
      y: {
        grid: { color: chartGridColor },
        ticks: { color: chartTickColor, font: { size: 11 }, stepSize: 1 },
        beginAtZero: true,
      }
    }
  };

  // Chart: Users by role (Doughnut)
  const roleLabels = report?.usersByRole ? Object.keys(report.usersByRole) : [];
  const roleData = report?.usersByRole ? Object.values(report.usersByRole) : [];
  const roleColors = ['#e94560', '#a855f7', '#3b82f6'];

  const doughnutData = {
    labels: roleLabels,
    datasets: [{
      data: roleData,
      backgroundColor: roleColors.map(c => c + '99'),
      borderColor: roleColors,
      borderWidth: 2,
      hoverOffset: 8,
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: legendLabelColor,
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 }
        }
      },
      tooltip: chartTooltip,
    },
    cutout: '65%',
  };

  // Chart: Revenue line
  const revenueByEvent = revenue?.revenueByEvent || [];
  const lineData = {
    labels: revenueByEvent.slice(0, 8).map(e => e.eventTitle?.substring(0, 15) + '...' || 'N/A'),
    datasets: [{
      label: t('admin.revenue'),
      data: revenueByEvent.slice(0, 8).map(e => e.revenue || 0),
      borderColor: '#e94560',
      backgroundColor: 'rgba(233, 69, 96, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#e94560',
      pointBorderColor: isLight ? '#fff' : '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltip,
        callbacks: {
          label: (ctx) => `${ctx.parsed.y?.toLocaleString(locale)}đ`
        }
      }
    },
    scales: {
      x: {
        grid: { color: chartGridColor },
        ticks: { color: chartTickColor, font: { size: 10 } }
      },
      y: {
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { size: 11 },
          callback: (v) => v >= 1000 ? (v / 1000) + 'k' : v
        },
        beginAtZero: true,
      }
    }
  };

  return (
    <AdminLayout title={`📊 ${t('admin.dashboard')}`} subtitle={t('admin.dashboardSub')}>
      {/* Stat Cards */}
      <div className="admin-stats-grid">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="admin-stat-card"
            onClick={card.onClick}
            style={{
              cursor: card.onClick ? 'pointer' : 'default',
              borderColor: card.accent ? card.accent : undefined,
              boxShadow: card.accent ? `0 0 0 2px ${card.accent}30` : undefined,
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
          >
            <div className="admin-stat-info">
              <div className="admin-stat-value" style={{ color: card.accent ?? undefined }}>
                {card.value.toLocaleString(locale)}
              </div>
              <div className="admin-stat-label">{card.label}</div>
            </div>
            <div className="admin-stat-icon">{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="admin-charts-grid">
        <div className="admin-chart-card">
          <h3>📊 {t('admin.eventsByMonth')}</h3>
          <div style={{ height: 260 }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
        <div className="admin-chart-card">
          <h3>👥 {t('admin.usersByRole')}</h3>
          <div style={{ height: 260 }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="admin-charts-grid">
        <div className="admin-chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>💰 {t('admin.revenueByEvent')}</h3>
          <div style={{ height: 260 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* Top 5 Events */}
      {stats?.top5Events?.length > 0 && (
        <div className="admin-table-card">
          <div className="admin-table-header">
            <h3>🔥 {t('admin.top5Events')}</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('admin.eventName')}</th>
                <th>{t('admin.location')}</th>
                <th>{t('admin.attendees')}</th>
                <th>{t('admin.status')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.top5Events.map((e, i) => (
                <tr key={e._id}>
                  <td style={{ fontWeight: 700, color: 'var(--admin-primary)' }}>{i + 1}</td>
                  <td><strong style={{ color: 'var(--admin-text)' }}>{e.title}</strong></td>
                  <td>{e.location}</td>
                  <td style={{ fontWeight: 600 }}>{e.currentAttendees}</td>
                  <td>
                    <span className={`admin-status-badge ${e.status?.toLowerCase()}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Events */}
      {report?.recentEvents?.length > 0 && (
        <div className="admin-table-card">
          <div className="admin-table-header">
            <h3>📋 {t('admin.recentEvents')}</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.name')}</th>
                <th>{t('admin.creator')}</th>
                <th>{t('admin.createdAt')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.attendees')}</th>
              </tr>
            </thead>
            <tbody>
              {report.recentEvents.map(e => (
                <tr key={e._id}>
                  <td><strong style={{ color: 'var(--admin-text)' }}>{e.title}</strong></td>
                  <td>{e.organizerName}</td>
                  <td>{e.createdAt ? new Date(e.createdAt).toLocaleDateString(locale) : '—'}</td>
                  <td>
                    <span className={`admin-status-badge ${e.status?.toLowerCase()}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>{e.currentAttendees} / {e.maxCapacity || '∞'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
