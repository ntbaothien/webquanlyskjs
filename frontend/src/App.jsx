import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Public / Attendee pages
import EventListPage from './pages/events/EventListPage';
import EventDetailPage from './pages/events/EventDetailPage';
import MyTicketsPage from './pages/tickets/MyTicketsPage';
import BookingPage from './pages/tickets/BookingPage';
import TicketQRPage from './pages/tickets/TicketQRPage';
import CheckInPage from './pages/tickets/CheckInPage';
import ResellMarketplacePage from './pages/tickets/ResellMarketplacePage';
import GroupBuyCheckoutPage from './pages/tickets/GroupBuyCheckoutPage';

// Organizer pages
import EventFormPage from './pages/orders/OrderListPage';
import MyEventsPage from './pages/admin/EventManagePage';
import EventEmailRemindersPage from './pages/admin/EventEmailRemindersPage';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage';
import UserManagePage from './pages/admin/UserManagePage';
import AdminEventManagePage from './pages/admin/AdminEventManagePage';
import ReportsPage from './pages/admin/ReportsPage';
import ResourceManagePage from './pages/admin/ResourceManagePage';
import CouponManagePage from './pages/admin/CouponManagePage';
import TopupManagePage from './pages/admin/TopupManagePage';
import OrganizerRegistrationsPage from './pages/organizer/OrganizerRegistrationsPage';
import ViolationReportsPage from './pages/admin/ViolationReportsPage';
import BannerManagePage from './pages/admin/BannerManagePage';
import CampaignManagePage from './pages/admin/CampaignManagePage';

// Wallet page
import WalletPage from './pages/wallet/WalletPage';

// Profile pages
import ProfilePage from './pages/profile/ProfilePage';
import SavedEventsPage from './pages/profile/SavedEventsPage';
import MyWaitlistPage from './pages/profile/MyWaitlistPage';
import LoyaltyDashboard from './pages/profile/LoyaltyDashboard';

// Error pages
import NotFoundPage from './pages/errors/NotFoundPage';

// Common components
import Footer from './components/common/Footer';
import ToastContainer from './components/common/Toast';
import ChatBox from './components/common/ChatBox';

// ---- Guards ----
const PrivateRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
};

const OrganizerRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  return !user ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <ChatBox />
      <Routes>
        {/* Public Auth */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        {/* Public Event Pages */}
        <Route path="/" element={<EventListPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/organizer/events/:eventId/emails" element={<OrganizerRoute><EventEmailRemindersPage /></OrganizerRoute>} />

        {/* Attendee-only */}
        <Route path="/my-registrations" element={<PrivateRoute><MyTicketsPage /></PrivateRoute>} />
        <Route path="/my-tickets" element={<PrivateRoute><MyTicketsPage /></PrivateRoute>} />
        <Route path="/events/:id/book" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
        <Route path="/tickets/:code" element={<PrivateRoute><TicketQRPage /></PrivateRoute>} />

        {/* Organizer + Admin */}
        <Route path="/organizer/my-events" element={<OrganizerRoute><MyEventsPage /></OrganizerRoute>} />
        <Route path="/organizer/events/create" element={<OrganizerRoute><EventFormPage /></OrganizerRoute>} />
        <Route path="/organizer/events/:id/edit" element={<OrganizerRoute><EventFormPage /></OrganizerRoute>} />
        <Route path="/organizer/events/:id/emails" element={<OrganizerRoute><EventEmailRemindersPage /></OrganizerRoute>} />
        <Route path="/organizer/check-in" element={<OrganizerRoute><CheckInPage /></OrganizerRoute>} />
        <Route path="/organizer/events/:id/registrations" element={<OrganizerRoute><OrganizerRegistrationsPage /></OrganizerRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserManagePage /></AdminRoute>} />
        <Route path="/admin/events" element={<AdminRoute><AdminEventManagePage /></AdminRoute>} />
        <Route path="/admin/events/:eventId/resources" element={<AdminRoute><ResourceManagePage /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
        <Route path="/admin/coupons" element={<AdminRoute><CouponManagePage /></AdminRoute>} />
        <Route path="/admin/topups" element={<AdminRoute><TopupManagePage /></AdminRoute>} />
        <Route path="/admin/violations" element={<AdminRoute><ViolationReportsPage /></AdminRoute>} />
        <Route path="/admin/banners" element={<AdminRoute><BannerManagePage /></AdminRoute>} />
        <Route path="/admin/campaigns" element={<AdminRoute><CampaignManagePage /></AdminRoute>} />

        {/* Wallet */}
        <Route path="/wallet" element={<PrivateRoute><WalletPage /></PrivateRoute>} />

        {/* Profile */}
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/profile/saved" element={<PrivateRoute><SavedEventsPage /></PrivateRoute>} />
        <Route path="/profile/loyalty" element={<PrivateRoute><LoyaltyDashboard /></PrivateRoute>} />
        <Route path="/my-waitlist" element={<PrivateRoute><MyWaitlistPage /></PrivateRoute>} />

        {/* Resell Marketplace */}
        <Route path="/marketplace" element={<ResellMarketplacePage />} />

        {/* Group Buy */}
        <Route path="/group-checkout/:inviteCode" element={<GroupBuyCheckoutPage />} />

        {/* 404 — catch all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
