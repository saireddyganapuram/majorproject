import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  BookOpen,
  Plus,
  KeyRound,
  Users,
  Video,
  Copy,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function ClassesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form states
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes');
      setClasses(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!className.trim()) return;

    try {
      setActionLoading(true);
      await api.post('/classes', {
        name: className,
        subject,
        description,
      });
      setShowCreateModal(false);
      setClassName('');
      setSubject('');
      setDescription('');
      await fetchClasses();
    } catch (err) {
      alert(err.message || 'Failed to create class');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setActionLoading(true);
      await api.post('/classes/join', { code: joinCode.trim() });
      setShowJoinModal(false);
      setJoinCode('');
      await fetchClasses();
    } catch (err) {
      alert(err.message || 'Failed to join class. Please check the code.');
    } finally {
      setActionLoading(false);
    }
  };

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary-600" />
            {isInstructor ? 'Course & Classroom Management' : 'My Enrolled Classes'}
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            {isInstructor
              ? 'Create courses, share unique join codes, and launch AI-analyzed live classroom sessions.'
              : 'Access your active classes, view upcoming sessions, and join live lectures.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isInstructor ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create Class
            </button>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
            >
              <KeyRound className="w-4 h-4" />
              Join by Code
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Classes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-surface-200 p-8 shadow-sm">
          <BookOpen className="w-12 h-12 text-surface-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-surface-800">No classes found</h3>
          <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
            {isInstructor
              ? 'Get started by creating your first class and inviting students with a class code.'
              : 'You are not enrolled in any classes yet. Click "Join by Code" to enroll.'}
          </p>
          <div className="mt-6">
            {isInstructor ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium"
              >
                Create Your First Class
              </button>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium"
              >
                Enter Class Code
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls._id}
              className="bg-white rounded-xl border border-surface-200 hover:border-primary-300 transition-all shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                    {cls.subject || 'General'}
                  </span>
                  {cls.activeSession && (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      LIVE NOW
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-surface-900 group-hover:text-primary-600 transition">
                  {cls.name}
                </h3>
                <p className="text-sm text-surface-600 mt-1 line-clamp-2">
                  {cls.description || 'No course description provided.'}
                </p>

                <div className="mt-4 pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-surface-400" />
                    <span>{cls.studentCount || 0} Students</span>
                  </div>
                  {isInstructor && (
                    <button
                      onClick={() => handleCopyCode(cls.code)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-100 hover:bg-surface-200 text-surface-700 transition"
                      title="Copy Class Code"
                    >
                      {copiedCode === cls.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="font-mono font-semibold">{cls.code}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-5 py-3 bg-surface-50 border-t border-surface-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/classes/${cls._id}`)}
                  className="text-xs font-medium text-surface-700 hover:text-primary-600"
                >
                  View Details & Schedule →
                </button>

                {cls.activeSession ? (
                  <button
                    onClick={() => navigate(`/classroom/${cls.activeSession._id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Enter Room
                  </button>
                ) : isInstructor ? (
                  <button
                    onClick={() => navigate(`/classes/${cls._id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-800 rounded-lg text-xs font-medium transition"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Manage
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-200">
            <h3 className="text-lg font-bold text-surface-900 mb-1">Create New Class</h3>
            <p className="text-xs text-surface-500 mb-4">
              Enter class details. A unique enrollment code will be automatically assigned.
            </p>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-401: Deep Learning"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="Overview of the course..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-surface-300 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-surface-200">
            <h3 className="text-lg font-bold text-surface-900 mb-1">Join a Classroom</h3>
            <p className="text-xs text-surface-500 mb-4">
              Enter the 6-character code provided by your course instructor.
            </p>

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Class Code *</label>
                <input
                  type="text"
                  required
                  maxLength="6"
                  placeholder="e.g. CV4010"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-base tracking-widest font-mono text-center uppercase font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 border border-surface-300 rounded-lg text-sm font-medium text-surface-700 hover:bg-surface-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? 'Enrolling...' : 'Join Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
