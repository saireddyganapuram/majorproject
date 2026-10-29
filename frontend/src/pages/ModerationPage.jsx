import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function ModerationPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewNoteInputs, setReviewNoteInputs] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  // Load classes on mount
  useEffect(() => {
    const initClasses = async () => {
      try {
        setLoading(true);
        const res = await api.get('/classes');
        const classList = res.data || [];
        setClasses(classList);

        if (classList.length > 0) {
          const firstClassId = classList[0]._id;
          setSelectedClassId(firstClassId);
          await loadSessionsForClass(firstClassId);
        }
      } catch (err) {
        console.error('Failed to load classes for moderation:', err);
      } finally {
        setLoading(false);
      }
    };

    initClasses();
  }, []);

  const loadSessionsForClass = async (classId) => {
    try {
      const res = await api.get(`/sessions/class/${classId}`);
      const sessionList = res.data || [];
      setSessions(sessionList);

      if (sessionList.length > 0) {
        const initialSessionId = sessionList[0]._id;
        setSelectedSessionId(initialSessionId);
        await loadEventsForSession(initialSessionId);
      } else {
        setSelectedSessionId('');
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadEventsForSession = async (sessionId) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const res = await api.get(`/moderation/sessions/${sessionId}/events`);
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to load moderation events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (classId) => {
    setSelectedClassId(classId);
    await loadSessionsForClass(classId);
  };

  const handleSessionChange = async (sessionId) => {
    setSelectedSessionId(sessionId);
    await loadEventsForSession(sessionId);
  };

  const handleReviewAction = async (eventId, newStatus) => {
    try {
      setActionLoading(eventId);
      const note = reviewNoteInputs[eventId] || '';
      const res = await api.patch(`/moderation/events/${eventId}/review`, {
        reviewStatus: newStatus,
        reviewNotes: note,
      });

      // Update local state
      setEvents((prev) =>
        prev.map((e) => (e._id === eventId ? { ...e, ...res.data } : e))
      );
    } catch (err) {
      alert(err.message || 'Failed to update review status');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (statusFilter === 'all') return true;
    return ev.reviewStatus === statusFilter;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
      case 'high':
        return 'bg-red-500/10 text-red-700 border-red-300';
      case 'medium':
        return 'bg-amber-500/10 text-amber-700 border-amber-300';
      default:
        return 'bg-blue-500/10 text-blue-700 border-blue-300';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-red-100 text-red-800';
      case 'dismissed':
        return 'bg-surface-100 text-surface-600';
      case 'reviewed':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-amber-100 text-amber-800 animate-pulse';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-600" />
            Classroom Chat NLP Moderation Hub
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Review messages flagged by the Machine Learning Toxicity classifier. Actions taken here are logged with audit timestamps.
          </p>
        </div>

        <button
          onClick={() => loadEventsForSession(selectedSessionId)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-xs font-semibold transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Events
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-surface-200 shadow-sm">
        {/* Class selector */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1">
            Course / Class:
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.classCode || c.code})
              </option>
            ))}
          </select>
        </div>

        {/* Session selector */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1">
            Lecture Session:
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.title} ({s.status})
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-1">
            Filter by Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            <option value="all">All Events ({events.length})</option>
            <option value="pending">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="confirmed">Confirmed Violation</option>
            <option value="dismissed">Dismissed (False Positive)</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center text-xs text-surface-400 rounded-2xl border border-surface-200">
            Loading moderation review queue...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white p-12 text-center text-surface-500 rounded-2xl border border-surface-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="font-bold text-sm text-surface-800">No Flagged Messages Found</h3>
            <p className="text-xs text-surface-400 mt-1">
              All messages in this session meet classroom conduct standards, or have already been reviewed.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev._id}
              className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm hover:border-surface-300 transition space-y-4"
            >
              {/* Event Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase ${getSeverityBadge(ev.severity)}`}>
                    {ev.severity} Severity
                  </span>
                  <span className="text-xs font-bold text-surface-900 capitalize">
                    Category: {ev.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${getStatusBadge(ev.reviewStatus)}`}>
                    {ev.reviewStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(ev.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Message Snapshot */}
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                <span className="text-[11px] font-bold text-surface-500 block mb-1">
                  Message Content from {ev.sender?.name || 'Student'} ({ev.sender?.email}):
                </span>
                <p className="text-sm font-mono text-surface-900 bg-white p-3 rounded-lg border border-surface-200">
                  "{ev.messageSnapshot}"
                </p>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-surface-500">
                  <span>ML Model: <code className="font-mono">{ev.modelName || 'tfidf_logistic_nlp_v2'}</code></span>
                  <span>Confidence: <strong>{Math.round((ev.modelConfidence || 0.85) * 100)}%</strong></span>
                </div>
              </div>

              {/* Review History / Notes if already reviewed */}
              {ev.reviewStatus !== 'pending' && (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-900">
                  <span className="font-bold">Reviewed by:</span> {ev.reviewer?.name || 'Instructor'} on{' '}
                  {ev.reviewedAt ? new Date(ev.reviewedAt).toLocaleString() : 'Recently'}
                  {ev.reviewNotes && (
                    <p className="mt-1 text-emerald-800">
                      <strong>Notes:</strong> {ev.reviewNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Actions Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Optional review notes or action taken..."
                  value={reviewNoteInputs[ev._id] || ''}
                  onChange={(e) =>
                    setReviewNoteInputs({ ...reviewNoteInputs, [ev._id]: e.target.value })
                  }
                  className="flex-1 px-3 py-1.5 border border-surface-300 rounded-lg text-xs placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={actionLoading === ev._id}
                    onClick={() => handleReviewAction(ev._id, 'dismissed')}
                    className="px-3 py-1.5 bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-semibold rounded-lg transition"
                  >
                    Dismiss (False Alarm)
                  </button>

                  <button
                    disabled={actionLoading === ev._id}
                    onClick={() => handleReviewAction(ev._id, 'confirmed')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Confirm Violation
                  </button>

                  <button
                    disabled={actionLoading === ev._id}
                    onClick={() => handleReviewAction(ev._id, 'reviewed')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
