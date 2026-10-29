import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart3,
  Users,
  Shield,
  ShieldAlert,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { useState } from 'react';

/**
 * Navigation items per role.
 */
const navigationByRole = {
  student: [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Classes', path: '/classes', icon: BookOpen },
    { name: 'Sessions', path: '/sessions', icon: Calendar },
    { name: 'My Analytics', path: '/analytics', icon: BarChart3 },
  ],
  instructor: [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Classes', path: '/classes', icon: BookOpen },
    { name: 'Sessions', path: '/sessions', icon: Calendar },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Moderation', path: '/moderation', icon: ShieldAlert },
    { name: 'Students', path: '/students', icon: Users },
  ],
  admin: [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Moderation', path: '/moderation', icon: ShieldAlert },
    { name: 'Security', path: '/admin/security', icon: Shield },
  ],
};

/**
 * DashboardLayout — authenticated layout with sidebar navigation.
 */
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = navigationByRole[user?.role] || navigationByRole.student;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 text-white
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-700">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold truncate">Virtual Classroom</h2>
            <p className="text-xs text-surface-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-surface-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                         text-surface-300 hover:text-white hover:bg-surface-800
                         transition-base group"
            >
              <item.icon className="w-5 h-5 text-surface-400 group-hover:text-primary-400 transition-base" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-surface-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-surface-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                       text-surface-400 hover:text-red-400 hover:bg-surface-800
                       transition-base mt-1"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-surface-500 hover:text-surface-700"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          <button className="relative text-surface-400 hover:text-surface-600 transition-base">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
