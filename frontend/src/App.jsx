import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import EventListPage from './pages/events/EventListPage';
import EventDetailPage from './pages/events/EventDetailPage';
import MyTicketsPage from './pages/tickets/MyTicketsPage';
import CheckoutPage from './pages/tickets/CheckoutPage';
import OrderListPage from './pages/orders/OrderListPage';
import ProfilePage from './pages/profile/ProfilePage';
import DashboardPage from './pages/admin/DashboardPage';
import UserManagePage from './pages/admin/UserManagePage';
import EventManagePage from './pages/admin/EventManagePage';
import Header from './components/common/Header';

const PrivateRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'Admin') return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  return !user ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Main layout routes (with Header) */}
        <Route path="/" element={<><Header /><EventListPage /></>} />
        <Route path="/events/:id" element={<><Header /><EventDetailPage /></>} />

        {/* Private routes */}
        <Route path="/my-tickets" element={<PrivateRoute><><Header /><MyTicketsPage /></></PrivateRoute>} />
        <Route path="/checkout/:eventId" element={<PrivateRoute><><Header /><CheckoutPage /></></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><><Header /><OrderListPage /></></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><><Header /><ProfilePage /></></PrivateRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserManagePage /></AdminRoute>} />
        <Route path="/admin/events" element={<AdminRoute><EventManagePage /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
