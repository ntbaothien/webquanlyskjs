import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

export default function BannerManagePage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await axiosInstance.get('/admin/banners');
      setBanners(data.data || []);
    } catch (err) {
      console.error(err);
      // Fallback cho testing UI
      if (err.response?.status === 404) {
        setBanners([
          { _id: '1', title: 'Summer Festival 2024', position: 'home_top', isActive: true, imageUrl: 'https://via.placeholder.com/800x200', linkUrl: '/events/1' },
          { _id: '2', title: 'Tech Conf Promo', position: 'sidebar', isActive: false, imageUrl: 'https://via.placeholder.com/300x250', linkUrl: '/events/2' }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn chắc chắn muốn xóa banner này?')) return;
    try {
      await axiosInstance.delete(`/admin/banners/${id}`);
      fetchBanners();
    } catch (err) {
      alert('Chưa có API xóa banner thực tế');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await axiosInstance.put(`/admin/banners/${id}`, { isActive: !currentStatus });
      fetchBanners();
    } catch (err) {
      alert('Chưa có API cập nhật banner thực tế');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="flex">
      {/* Sidebar - Tái sử dụng CSS từ Layout */}
      <div className="sidebar" style={{ top: 64 }}>
        <div className="sidebar-label">Admin Panel</div>
        <div className="sidebar-item" onClick={() => navigate('/admin')}>📊 Tổng quan</div>
        <div className="sidebar-item" onClick={() => navigate('/admin/users')}>👥 Người dùng</div>
        <div className="sidebar-item" onClick={() => navigate('/admin/events')}>🎪 Sự kiện</div>
        <div className="sidebar-label">Marketing</div>
        <div className="sidebar-item active">🖼️ Banners</div>
        <div className="sidebar-item" onClick={() => navigate('/admin/campaigns')}>📢 Chiến dịch</div>
      </div>

      <div className="admin-main flex-col w-full" style={{ padding: '24px 32px' }}>
        <div className="flex-between mb-24">
          <div>
            <h2>Quản lý Banner</h2>
            <p className="mt-8 text-muted">Cấu hình banner quảng cáo trên hệ thống</p>
          </div>
          <button className="btn btn-primary" onClick={() => alert('Chưa hỗ trợ tạo banner mới trên UI')}>
            + Thêm Banner
          </button>
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Hình ảnh</th>
                  <th>Tiêu đề</th>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {banners.map(banner => (
                  <tr key={banner._id}>
                    <td>
                      <img src={banner.imageUrl} alt={banner.title} style={{ height: 40, width: 80, objectFit: 'cover', borderRadius: 4 }} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{banner.title}</td>
                    <td><span className="badge badge-purple">{banner.position}</span></td>
                    <td>
                      <span className={`badge ${banner.isActive ? 'badge-green' : 'badge-red'}`} style={{ cursor: 'pointer' }} onClick={() => handleToggleActive(banner._id, banner.isActive)}>
                        {banner.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm">Sửa</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(banner._id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {banners.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: 40 }}>Chưa có banner nào</td>
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
