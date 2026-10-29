import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Protected pages
import DashboardPage from './pages/DashboardPage';
import ClassesPage from './pages/ClassesPage';
import ClassDetailPage from './pages/ClassDetailPage';
import LiveClassroomPage from './pages/LiveClassroomPage';
import AnalyticsReportPage from './pages/AnalyticsReportPage';
import StudentInsightsPage from './pages/StudentInsightsPage';
import ModerationPage from './pages/ModerationPage';
import AdminPage from './pages/AdminPage';

/**
 * Dispatcher to route students to self-reflection and instructors to class-wide analytics.
 */
function AnalyticsDispatcher() {
  const { user } = useAuth();
  return user?.role === 'student' ? <StudentInsightsPage /> : <AnalyticsReportPage />;
}

/**
 * Root application component.
 * Defines all routes, layouts, and authentication boundaries.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes — all roles */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/classes/:id" element={<ClassDetailPage />} />
            <Route path="/sessions" element={<ClassesPage />} />
            <Route path="/students" element={<ClassesPage />} />
            <Route path="/analytics" element={<AnalyticsDispatcher />} />
            <Route path="/analytics/:sessionId" element={<AnalyticsReportPage />} />
            <Route path="/classroom/:sessionId" element={<LiveClassroomPage />} />
            <Route path="/moderation" element={<ModerationPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/users" element={<AdminPage />} />
            <Route path="/admin/security" element={<AdminPage />} />
            <Route path="/admin/settings" element={<AdminPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Error pages */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
