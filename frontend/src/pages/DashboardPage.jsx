import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  BookOpen,
  Calendar,
  Activity,
  ArrowRight,
  Video,
  Sparkles,
  Users,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/classes');
        const classList = res.data || [];
        setClasses(classList);

        // Find any currently live session
        for (const c of classList) {
          if (c.activeSession) {
            setActiveSession({ ...c.activeSession, classId: c._id, className: c.name });
            break;
          }
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            AI-Enhanced Virtual Classroom
          </span>
          <h1 className="text-2xl font-black">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-primary-100 text-xs sm:text-sm mt-1 max-w-xl">
            {isInstructor
              ? 'Monitor live classroom participation, launch AI-driven lectures, and review comprehensive academic engagement reports.'
              : 'Join scheduled class sessions, participate in real-time chats, and review your private focus analytics.'}
          </p>
        </div>

        {activeSession && (
          <button
            onClick={() => navigate(`/classroom/${activeSession._id}`)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition self-start sm:self-auto animate-pulse"
          >
            <Video className="w-4 h-4" />
            Join Live Class Now
          </button>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Active Courses</span>
          <div className="text-3xl font-extrabold text-surface-900 mt-2">{classes.length}</div>
          <span className="text-[11px] text-surface-400 mt-1 block">
            {isInstructor ? 'Courses instructed' : 'Courses enrolled'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Classroom Status</span>
          <div className="text-xl font-bold text-emerald-600 mt-2 flex items-center gap-1.5">
            <CheckCircle className="w-5 h-5" /> Online
          </div>
          <span className="text-[11px] text-surface-400 mt-1 block">WebSockets & AI ready</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Privacy Guarantee</span>
          <div className="text-xl font-bold text-blue-600 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5" /> 100% Protected
          </div>
          <span className="text-[11px] text-surface-400 mt-1 block">Zero raw video stored</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Account Role</span>
          <div className="text-xl font-bold text-surface-800 mt-2 capitalize">{user?.role}</div>
          <span className="text-[11px] text-surface-400 mt-1 block">{user?.email}</span>
        </div>
      </div>

      {/* Navigation Quick Actions */}
      <div>
        <h3 className="text-sm font-bold text-surface-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/classes')}
            className="bg-white p-5 rounded-xl border border-surface-200 hover:border-primary-300 shadow-sm hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-600 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-surface-900 mt-3 group-hover:text-primary-600 transition">
              {isInstructor ? 'Manage Classes' : 'My Classes'}
            </h4>
            <p className="text-xs text-surface-500 mt-1">
              {isInstructor
                ? 'Create classes, share join codes, and view enrolled student rosters.'
                : 'Browse courses, join new classes by code, and view lectures.'}
            </p>
          </div>

          <div
            onClick={() => navigate('/analytics')}
            className="bg-white p-5 rounded-xl border border-surface-200 hover:border-primary-300 shadow-sm hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-600 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="font-bold text-surface-900 mt-3 group-hover:text-primary-600 transition">
              {isInstructor ? 'Engagement Analytics' : 'My Focus Insights'}
            </h4>
            <p className="text-xs text-surface-500 mt-1">
              {isInstructor
                ? 'Review temporal trajectories, attention distributions, and export reports.'
                : 'View your private session focus history and constructive study recommendations.'}
            </p>
          </div>

          {activeSession ? (
            <div
              onClick={() => navigate(`/classroom/${activeSession._id}`)}
              className="bg-white p-5 rounded-xl border border-emerald-300 shadow-sm hover:shadow-md transition cursor-pointer group bg-emerald-50/30"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="font-bold text-emerald-800 mt-3">Live Class in Progress</h4>
              <p className="text-xs text-emerald-600 mt-1 truncate">{activeSession.title}</p>
            </div>
          ) : (
            <div
              onClick={() => navigate('/classes')}
              className="bg-white p-5 rounded-xl border border-surface-200 hover:border-primary-300 shadow-sm hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-600 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="font-bold text-surface-900 mt-3 group-hover:text-primary-600 transition">
                Sessions & Schedule
              </h4>
              <p className="text-xs text-surface-500 mt-1">
                View scheduled lectures, past recordings, and upcoming class timelines.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
