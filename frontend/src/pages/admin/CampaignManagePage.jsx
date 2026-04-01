import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { 
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
}) : '';

export default function CampaignManagePage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data } = await axiosInstance.get('/admin/campaigns');
      setCampaigns(data.data || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setCampaigns([
          { _id: '1', name: 'Nhắc nhở giáng sinh', type: 'email_blast', status: 'Sent', sentCount: 1542, scheduledAt: new Date(Date.now() - 86400000) },
          { _id: '2', name: 'Khuyến mãi năm mới', type: 'push', status: 'Scheduled', sentCount: 0, scheduledAt: new Date(Date.now() + 172800000) }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (id) => {
    if (!confirm('Bạn chắc chắn muốn gửi chiến dịch này ngay bây giờ?')) return;
    try {
      await axiosInstance.post(`/admin/campaigns/${id}/send`);
      fetchCampaigns();
    } catch (err) {
      alert('Chưa có API gửi chiến dịch thực tế');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="flex">
      <div className="sidebar" style={{ top: 64 }}>
        <div className="sidebar-label">Admin Panel</div>
        <div className="sidebar-item" onClick={() => navigate('/admin')}>📊 Tổng quan</div>
        <div className="sidebar-item" onClick={() => navigate('/admin/users')}>👥 Người dùng</div>
        <div className="sidebar-item" onClick={() => navigate('/admin/events')}>🎪 Sự kiện</div>
        <div className="sidebar-label">Marketing</div>
        <div className="sidebar-item" onClick={() => navigate('/admin/banners')}>🖼️ Banners</div>
        <div className="sidebar-item active">📢 Chiến dịch</div>
      </div>

      <div className="admin-main flex-col w-full" style={{ padding: '24px 32px' }}>
        <div className="flex-between mb-24">
          <div>
            <h2>Quản lý Chiến dịch</h2>
            <p className="mt-8 text-muted">Email Marketing & Push Notifications</p>
          </div>
          <button className="btn btn-primary" onClick={() => alert('Chưa hỗ trợ tạo UI chi tiết')}>
            + Tạo Chiến dịch
          </button>
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Tên chiến dịch</th>
                  <th>Loại</th>
                  <th>Thời gian lên lịch</th>
                  <th>Thống kê</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(camp => (
                  <tr key={camp._id}>
                    <td style={{ fontWeight: 600 }}>{camp.name}</td>
                    <td>
                      <span className={camp.type === 'email_blast' ? 'badge badge-blue' : 'badge badge-orange'}>
                        {camp.type}
                      </span>
                    </td>
                    <td>{formatDate(camp.scheduledAt)}</td>
                    <td>{camp.sentCount} lượt gửi</td>
                    <td>
                      <span className={`badge ${
                        camp.status === 'Sent' ? 'badge-green' : 
                        camp.status === 'Draft' ? 'badge-purple' : 'badge-orange'
                      }`}>
                        {camp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        {camp.status !== 'Sent' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSendNow(camp._id)}>Gửi ngay</button>
                        )}
                        <button className="btn btn-ghost btn-sm">Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ padding: 40 }}>Chưa có chiến dịch nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
