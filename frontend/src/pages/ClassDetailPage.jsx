import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  BookOpen,
  Calendar,
  Users,
  Video,
  BarChart3,
  Plus,
  Play,
  ArrowLeft,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function ClassDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'students'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Schedule session modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/classes/${id}`);
      setClassData(res.data);

      const sessRes = await api.get(`/sessions/class/${id}`);
      setSessions(sessRes.data || []);

      if (user?.role === 'instructor' || user?.role === 'admin') {
        const studRes = await api.get(`/classes/${id}/students`);
        setStudents(studRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    try {
      setActionLoading(true);
      const scheduledStart = startDate ? new Date(startDate) : new Date();
      const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);

      await api.post('/sessions', {
        classId: id,
        title: sessionTitle,
        description: sessionDesc,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
      });

      setShowScheduleModal(false);
      setSessionTitle('');
      setSessionDesc('');
      await fetchClassDetails();
    } catch (err) {
      alert(err.message || 'Failed to create session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await api.patch(`/sessions/${sessionId}/start`);
      navigate(`/classroom/${sessionId}`);
    } catch (err) {
      alert(err.message || 'Failed to start session');
    }
  };

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-surface-500">
        Loading classroom details...
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        {error || 'Class not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/classes')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Classes
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                {classData.subject || 'Course'}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full bg-surface-100 text-surface-700">
                Code: {classData.code}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-surface-900">{classData.name}</h1>
            <p className="text-sm text-surface-600 mt-2 max-w-3xl">
              {classData.description || 'No description provided.'}
            </p>
          </div>

          {isInstructor && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition whitespace-nowrap self-start"
            >
              <Plus className="w-4 h-4" />
              Schedule Session
            </button>
          )}
        </div>

        {/* Quick Info Bar */}
        <div className="mt-6 pt-6 border-t border-surface-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-surface-600">
          <div>
            <span className="block text-surface-400 font-medium">Instructor</span>
            <span className="font-semibold text-surface-800 text-sm mt-0.5 block">
              {classData.instructor?.name || 'Assigned Professor'}
            </span>
          </div>
          <div>
            <span className="block text-surface-400 font-medium">Enrolled Students</span>
            <span className="font-semibold text-surface-800 text-sm mt-0.5 block">
              {classData.studentCount || 0} Learners
            </span>
          </div>
          <div>
            <span className="block text-surface-400 font-medium">Total Sessions</span>
            <span className="font-semibold text-surface-800 text-sm mt-0.5 block">
              {sessions.length} Lectures
            </span>
          </div>
          <div>
            <span className="block text-surface-400 font-medium">Status</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-sm mt-0.5">
              <CheckCircle className="w-4 h-4" /> Active Course
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'sessions'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Classroom Sessions ({sessions.length})
        </button>
        {isInstructor && (
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'students'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Enrolled Students ({students.length})
          </button>
        )}
      </div>

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-surface-200 p-6 text-surface-500 text-sm">
              No sessions scheduled for this class yet.
            </div>
          ) : (
            sessions.map((sess) => (
              <div
                key={sess._id}
                className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        sess.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                          : sess.status === 'completed'
                          ? 'bg-surface-100 text-surface-600'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {sess.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-surface-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(sess.scheduledStart).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-surface-900">{sess.title}</h3>
                  <p className="text-xs text-surface-500 max-w-xl">
                    {sess.description || 'No session agenda specified.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {sess.status === 'active' && (
                    <button
                      onClick={() => navigate(`/classroom/${sess._id}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                    >
                      <Video className="w-4 h-4" />
                      Enter Live Classroom
                    </button>
                  )}

                  {sess.status === 'scheduled' && isInstructor && (
                    <button
                      onClick={() => handleStartSession(sess._id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium shadow-sm transition"
                    >
                      <Play className="w-4 h-4" />
                      Start Session
                    </button>
                  )}

                  {sess.status === 'completed' && (
                    <button
                      onClick={() => navigate(`/analytics/${sess._id}`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-100 hover:bg-surface-200 text-surface-800 rounded-lg text-xs font-semibold transition"
                    >
                      <BarChart3 className="w-4 h-4 text-primary-600" />
                      View Analytics
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && isInstructor && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-surface-800">Class Roster</h3>
            <span className="text-xs text-surface-500">{students.length} Total Enrolled</span>
          </div>

          <div className="divide-y divide-surface-100">
            {students.length === 0 ? (
              <div className="p-6 text-center text-xs text-surface-500">No students enrolled yet.</div>
            ) : (
              students.map((e) => (
                <div key={e._id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                      {e.studentId?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{e.studentId?.name}</p>
                      <p className="text-xs text-surface-400">{e.studentId?.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 font-medium">
                    {e.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-200">
            <h3 className="text-lg font-bold text-surface-900 mb-1">Schedule Live Session</h3>
            <p className="text-xs text-surface-500 mb-4">
              Create an upcoming video lecture session with AI engagement telemetry.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lecture 4: Object Recognition"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Agenda / Description</label>
                <textarea
                  rows="3"
                  placeholder="Topics covered in this session..."
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-surface-300 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Scheduling...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
