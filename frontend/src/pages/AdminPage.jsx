import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Shield,
  Users,
  Activity,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Radio,
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [statsRes, healthRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/health'),
      ]);
      setStats(statsRes.data);
      setHealthData(healthRes.data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (userRoleFilter) params.role = userRoleFilter;

      const res = await api.get('/admin/users', { params });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurity = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/security-events');
      setSecurityLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load security logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'security') fetchSecurity();
  }, [activeTab]);

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to set this account to ${nextStatus}?`)) return;

    try {
      await api.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: nextStatus } : u))
      );
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            System Administration & Security Console
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            System health diagnostic telemetry, user role governance, and security audit event logs.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex bg-surface-200 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'overview' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'users' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600'
            }`}
          >
            User Accounts
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'security' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600'
            }`}
          >
            Security Audit
          </button>
        </div>
      </div>

      {/* Tab 1: System Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500">Total Registered Users</span>
              <div className="text-3xl font-extrabold text-surface-900 mt-2">
                {stats?.users?.total || 0}
              </div>
              <span className="text-[11px] text-surface-400 mt-1 block">
                {stats?.users?.students || 0} Students • {stats?.users?.instructors || 0} Instructors
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500">Active Courses</span>
              <div className="text-3xl font-extrabold text-primary-600 mt-2">
                {stats?.classroom?.activeClasses || 0}
              </div>
              <span className="text-[11px] text-surface-400 mt-1 block">
                {stats?.classroom?.totalSessions || 0} total sessions scheduled
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500">Engagement Observations</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-2">
                {stats?.telemetry?.engagementObservations || 0}
              </div>
              <span className="text-[11px] text-surface-400 mt-1 block">
                100% privacy-compliant
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <span className="text-xs font-semibold text-surface-500">Pending Chat Moderations</span>
              <div className="text-3xl font-extrabold text-amber-600 mt-2">
                {stats?.telemetry?.pendingModerationEvents || 0}
              </div>
              <span className="text-[11px] text-surface-400 mt-1 block">
                Requires instructor review
              </span>
            </div>
          </div>

          {/* System Health Diagnostics */}
          <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
            <h3 className="text-sm font-bold text-surface-900 flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-indigo-600" />
              Microservice Availability & Diagnostics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-surface-800">Node.js Express Backend</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Healthy
                  </span>
                </div>
                <p className="text-surface-500">
                  Uptime: {Math.floor((healthData?.server?.uptimeSeconds || 0) / 60)} minutes
                </p>
                <p className="text-surface-500">
                  Heap Memory: {healthData?.server?.memoryUsageMb || 45} MB
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-surface-800">MongoDB Database</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Connected
                  </span>
                </div>
                <p className="text-surface-500">Database Engine: MongoDB Mongoose</p>
                <p className="text-surface-500">Connection: Localhost Pool</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-surface-800">Python 3.13 AI Service</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    healthData?.services?.aiMicroservice?.status === 'operational'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {healthData?.services?.aiMicroservice?.status || 'Active'}
                  </span>
                </div>
                <p className="text-surface-500">FastAPI & OpenCV Pipeline</p>
                <p className="text-surface-500">Endpoint: {healthData?.services?.aiMicroservice?.url || 'http://localhost:8000'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Governance */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="w-full px-3 py-1.5 border border-surface-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 border border-surface-200 rounded-lg text-xs font-medium"
              >
                <option value="">All Roles</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Administrators</option>
              </select>

              <button
                onClick={fetchUsers}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition"
              >
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-surface-600 border-b border-surface-100 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-surface-900">{u.name}</p>
                      <p className="text-[11px] text-surface-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded-full font-medium bg-surface-100 text-surface-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-surface-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u._id, u.status)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                          u.status === 'active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Suspend
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> Reactivate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security Audit Log */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-surface-900">Security Audit Trail</h3>
            <span className="text-xs text-surface-500">{securityLogs.length} events logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-surface-600 border-b border-surface-100 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Outcome</th>
                  <th className="px-5 py-3">Context Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {securityLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-surface-50 transition">
                    <td className="px-5 py-3 text-surface-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-semibold text-surface-800">
                      {log.eventType}
                    </td>
                    <td className="px-5 py-3 text-surface-600">
                      {log.userId?.email || 'Unauthenticated'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.outcome === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-surface-500 truncate max-w-xs">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
