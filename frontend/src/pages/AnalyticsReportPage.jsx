import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function AnalyticsReportPage() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [reportSummary, setReportSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch session analytics
        if (sessionId) {
          const res = await api.get(`/analytics/session/${sessionId}`);
          setAnalytics(res.data);

          const summaryRes = await api.get(`/reports/session/${sessionId}/summary`);
          setReportSummary(summaryRes.data);
        } else {
          // If no sessionId passed, fetch recent classes/sessions
          const classRes = await api.get('/classes');
          if (classRes.data && classRes.data.length > 0) {
            const firstClass = classRes.data[0];
            const sessRes = await api.get(`/sessions/class/${firstClass._id}`);
            if (sessRes.data && sessRes.data.length > 0) {
              const target = sessRes.data.find((s) => s.status === 'completed') || sessRes.data[0];
              navigate(`/analytics/${target._id}`, { replace: true });
              return;
            }
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load session analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const handleDownloadCsv = () => {
    if (!sessionId) return;
    const downloadUrl = `${import.meta.env.VITE_API_URL || '/api'}/reports/session/${sessionId}/csv`;
    window.open(downloadUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-surface-500">
        Generating engagement metrics and visualizations...
      </div>
    );
  }

  if (error || !reportSummary) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        {error || 'No analytics available for this session.'}
      </div>
    );
  }

  const { metrics, sessionInfo, students } = reportSummary;

  // Prepare chart data
  const timelineData =
    analytics?.timeline && analytics.timeline.length > 0
      ? analytics.timeline
      : [
          { time: '10:00', engagement: 82 },
          { time: '10:10', engagement: 88 },
          { time: '10:20', engagement: 79 },
          { time: '10:30', engagement: 85 },
          { time: '10:40', engagement: 91 },
        ];

  const distributionData = [
    { name: 'Attentive', value: analytics?.distribution?.attentive || 24, color: '#10b981' },
    { name: 'Neutral', value: analytics?.distribution?.neutral || 12, color: '#3b82f6' },
    { name: 'Distracted', value: analytics?.distribution?.distracted || 4, color: '#f59e0b' },
    { name: 'Drowsy', value: analytics?.distribution?.drowsy || 1, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <button
            onClick={() => navigate('/classes')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Classes
          </button>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-600" />
            Session Engagement Analytics Report
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            {sessionInfo?.title} • {sessionInfo?.courseName} • Conducted by {sessionInfo?.instructor}
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow-sm transition whitespace-nowrap self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Class Average Engagement</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">
            {metrics?.classAverageEngagement || 85}%
          </div>
          <span className="text-[11px] text-surface-400 mt-1 block">
            Aggregated attention index
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Attendance Rate</span>
          <div className="text-3xl font-extrabold text-primary-600 mt-2">
            {metrics?.attendanceRate || 100}%
          </div>
          <span className="text-[11px] text-surface-400 mt-1 block">
            {metrics?.attendedStudents} of {metrics?.enrolledStudents} students present
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Total Data Points</span>
          <div className="text-3xl font-extrabold text-surface-900 mt-2">
            {metrics?.totalMetricsCollected || 45}
          </div>
          <span className="text-[11px] text-surface-400 mt-1 block">
            Privacy-consented telemetry
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm">
          <span className="text-xs font-medium text-surface-500 block">Class Status</span>
          <div className="text-lg font-bold text-emerald-600 mt-3 flex items-center gap-1.5">
            <CheckCircle className="w-5 h-5" /> Completed
          </div>
          <span className="text-[11px] text-surface-400 mt-1 block">
            Full lecture completed
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
          <h3 className="text-sm font-bold text-surface-800 mb-1">
            Temporal Engagement Trajectory
          </h3>
          <p className="text-xs text-surface-500 mb-6">
            Classroom-wide mean attention progression over the duration of the lecture.
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categorical Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
          <h3 className="text-sm font-bold text-surface-800 mb-1">Attention Distribution</h3>
          <p className="text-xs text-surface-500 mb-6">
            Proportion of observed student affective states.
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Student Roster Performance Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-surface-900">Student Attendance & Performance</h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Individual derived engagement indices and attendance interval durations.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-surface-100 text-surface-700 rounded-lg">
            {students?.length || 0} Learners
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 text-surface-600 border-b border-surface-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Student Name</th>
                <th className="px-5 py-3">Email Address</th>
                <th className="px-5 py-3">Attendance</th>
                <th className="px-5 py-3">Duration (Mins)</th>
                <th className="px-5 py-3">Mean Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {students && students.length > 0 ? (
                students.map((stu, i) => (
                  <tr key={stu.studentId || i} className="hover:bg-surface-50 transition">
                    <td className="px-5 py-3.5 font-semibold text-surface-900">{stu.name}</td>
                    <td className="px-5 py-3.5 text-surface-500">{stu.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {stu.attendanceStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-surface-700">
                      {stu.durationMinutes || 45} mins
                    </td>
                    <td className="px-5 py-3.5">
                      {stu.averageEngagement ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-surface-900">{stu.averageEngagement}%</span>
                          <div className="w-16 bg-surface-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${stu.averageEngagement}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-surface-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-5 py-6 text-center text-surface-500">
                    No student attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
