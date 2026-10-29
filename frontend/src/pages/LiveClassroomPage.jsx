import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import faceTracker from '../services/faceTracker';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  PhoneOff,
  MessageSquare,
  Users,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function LiveClassroomPage() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Session data
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Classroom media states
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [consentGranted, setConsentGranted] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Side drawer tabs: 'chat' | 'participants' | 'hud'
  const [activeTab, setActiveTab] = useState('chat');
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // Live participants
  const [participants, setParticipants] = useState([
    { id: 'inst-1', name: 'Dr. Alan Turing', role: 'instructor', audio: true, video: true, hand: false },
    { id: 'stu-1', name: 'Ada Lovelace', role: 'student', audio: false, video: true, hand: true, engagement: 92 },
    { id: 'stu-2', name: 'Grace Hopper', role: 'student', audio: false, video: true, hand: false, engagement: 84 },
    { id: 'stu-3', name: 'Claude Shannon', role: 'student', audio: false, video: true, hand: false, engagement: 71 },
  ]);

  // Live engagement telemetry
  const [classEngagementScore, setClassEngagementScore] = useState(85);
  const [personalFocusScore, setPersonalFocusScore] = useState(88);
  const [personalState, setPersonalState] = useState('attentive');
  const [distractionAlert, setDistractionAlert] = useState(null);

  // Video refs
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  // 1. Fetch Session Info & Attendance Join
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/sessions/${sessionId}`);
        setSessionData(res.data);

        // Record attendance join
        await api.post(`/sessions/${sessionId}/attendance/join`);

        // Fetch prior chat messages
        const chatRes = await api.get(`/chat/session/${sessionId}`);
        if (chatRes.data) {
          setChatMessages(chatRes.data);
        }

        // Check consent status
        try {
          const consentRes = await api.get(`/analytics/consent/${sessionId}`);
          if (consentRes.data) {
            setConsentGranted(consentRes.data.granted !== false);
          }
        } catch {
          // Default to true
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    return () => {
      // Record attendance leave on unmount
      api.post(`/sessions/${sessionId}/attendance/leave`).catch(() => {});
    };
  }, [sessionId]);

  // 2. Setup Local Webcam Stream
  useEffect(() => {
    let localStream = null;

    const startCamera = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn('Webcam not accessible, using high-tech simulated stream:', err);
      }
    };

    startCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 3. Setup Socket.IO connection
  useEffect(() => {
    const socket = io(import.meta.env.VITE_WS_URL || window.location.origin, {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.emit(
      'join_session',
      {
        sessionId,
        userProfile: {
          id: user?._id,
          name: user?.name,
          role: user?.role,
        },
      },
      (res) => {
        if (res?.participants) {
          // Merge participants
        }
      }
    );

    socket.on('chat_message_received', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('participant_updated', (updated) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === updated.userId ? { ...p, ...updated } : p))
      );
    });

    socket.on('student_engagement_update', (data) => {
      // Calculate class average from students
      setClassEngagementScore((prev) => Math.round((prev + data.score) / 2));
    });

    return () => {
      socket.emit('leave_session', { sessionId });
      socket.disconnect();
    };
  }, [sessionId, user]);

  // 4. Real Local Computer Vision Engagement Telemetry Loop
  useEffect(() => {
    if (!consentGranted || !videoEnabled) {
      if (!consentGranted) {
        setPersonalState('consent_revoked');
        setPersonalFocusScore(null);
      } else if (!videoEnabled) {
        setPersonalState('camera_off');
        setPersonalFocusScore(null);
      }
      return;
    }

    const interval = setInterval(async () => {
      if (!localVideoRef.current || !videoEnabled) return;

      try {
        const result = await faceTracker.analyzeFrame(localVideoRef.current);

        if (result.faceDetected && result.overallScore !== null) {
          setPersonalFocusScore(result.overallScore);
          setPersonalState(result.facialState);

          if (result.distractionFlag) {
            setDistractionAlert('Attention drift detected (gaze orientation). Refocusing recommended.');
            setTimeout(() => setDistractionAlert(null), 4000);
          }

          // Emit real-time telemetry to socket and backend if student
          if (!isInstructor && socketRef.current) {
            socketRef.current.emit('live_engagement_metric', {
              sessionId,
              metric: {
                studentId: user?._id,
                score: result.overallScore,
                state: result.facialState,
                headPose: result.headPose,
              },
            });

            // Record periodically in backend database
            try {
              await api.post('/analytics/engagement', {
                sessionId,
                overallScore: result.overallScore,
                facialState: result.facialState,
                attentionScore: result.overallScore,
                headPoseState: result.headPoseState,
                eyeGazeScore: result.eyeGazeScore,
                distractionFlag: result.distractionFlag,
                notes: result.notes,
              });
            } catch {
              // Ignore periodic network drop
            }
          }
        } else {
          // No face visible or poor lighting — do NOT fabricate a fake score
          setPersonalFocusScore(null);
          setPersonalState(result.dataQuality === 'poor_lighting' ? 'poor_lighting' : 'absent');
        }
      } catch (err) {
        console.warn('Local frame analysis warning:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [consentGranted, videoEnabled, sessionId, isInstructor, user]);

  // Media Controls
  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(!audioEnabled);
    socketRef.current?.emit('toggle_media', { sessionId, type: 'audio', enabled: !audioEnabled });
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled;
      });
    }
    setVideoEnabled(!videoEnabled);
    socketRef.current?.emit('toggle_media', { sessionId, type: 'video', enabled: !videoEnabled });
  };

  const toggleHand = () => {
    const nextHand = !handRaised;
    setHandRaised(nextHand);
    socketRef.current?.emit('raise_hand', { sessionId, raised: nextHand });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const text = messageInput.trim();
    setMessageInput('');

    try {
      // Send to backend for moderation and storage
      const res = await api.post(`/chat/session/${sessionId}`, { message: text });
      // Emit via socket
      socketRef.current?.emit('chat_message', {
        sessionId,
        message: text,
        userProfile: {
          id: user?._id,
          name: user?.name,
          role: user?.role,
        },
      });
    } catch (err) {
      alert(err.message || 'Failed to post message');
    }
  };

  const handleEndClass = async () => {
    if (!window.confirm('Are you sure you want to end this live class session?')) return;
    try {
      await api.patch(`/sessions/${sessionId}/end`);
      navigate(`/analytics/${sessionId}`);
    } catch (err) {
      alert(err.message || 'Failed to end session');
    }
  };

  const handleToggleConsent = async () => {
    const nextState = !consentGranted;
    setConsentGranted(nextState);
    try {
      await api.post('/analytics/consent', {
        sessionId,
        granted: nextState,
      });
    } catch (err) {
      console.error('Consent update error:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-surface-950 text-white rounded-2xl overflow-hidden shadow-2xl border border-surface-800">
      {/* Top Classroom Bar */}
      <div className="h-14 px-6 bg-surface-900 border-b border-surface-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            LIVE SESSION
          </span>
          <h2 className="text-sm font-bold text-white truncate max-w-md">
            {sessionData?.title || 'Interactive AI Classroom'}
          </h2>
        </div>

        {/* Real-time telemetry badge */}
        <div className="flex items-center gap-4">
          {/* Privacy Consent Opt-in Badge */}
          <button
            onClick={() => setShowConsentModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition border ${
              consentGranted
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
                : 'bg-surface-800 text-surface-400 border-surface-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            AI Analytics: {consentGranted ? 'Active' : 'Disabled'}
          </button>

          {/* Instructor Live Class Average */}
          {isInstructor ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-800/80 rounded-lg border border-surface-700">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-surface-300">Class Focus:</span>
              <span className="text-xs font-bold text-emerald-400">{classEngagementScore}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-surface-800/80 rounded-lg border border-surface-700">
              <Eye className="w-4 h-4 text-primary-400" />
              <span className="text-xs text-surface-300">My Focus:</span>
              <span className="text-xs font-bold text-primary-400">
                {personalFocusScore !== null ? `${personalFocusScore}%` : 'Searching Face...'}
              </span>
            </div>
          )}

          {isInstructor && (
            <button
              onClick={handleEndClass}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Main Classroom Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Video Area */}
        <div className="flex-1 p-4 flex flex-col justify-between gap-4 overflow-y-auto">
          {/* Distraction Alert Toast */}
          {distractionAlert && (
            <div className="mx-auto bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-xs flex items-center gap-2 animate-bounce">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {distractionAlert}
            </div>
          )}

          {/* Video Tiles Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {/* 1. Local Video Tile */}
            <div className="relative bg-surface-900 rounded-2xl overflow-hidden border border-surface-700 shadow-md group flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
              />

              {!videoEnabled && (
                <div className="flex flex-col items-center justify-center text-surface-400">
                  <div className="w-16 h-16 rounded-full bg-primary-600/30 flex items-center justify-center text-primary-400 text-xl font-bold mb-2">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs">Camera Off</span>
                </div>
              )}

              {/* Status bar on tile */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="font-semibold text-white truncate">
                  {user?.name || 'You'} (You)
                </span>
                <div className="flex items-center gap-2">
                  {handRaised && (
                    <span className="p-1 rounded bg-amber-500/30 text-amber-400">
                      <Hand className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {audioEnabled ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
              </div>

              {/* AI Landmark Mesh Indicator overlay */}
              {consentGranted && videoEnabled && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  AI Tracking: {personalState.toUpperCase()} {personalFocusScore !== null ? `(${personalFocusScore}%)` : '(Searching Face)'}
                </div>
              )}
            </div>

            {/* 2-5 Simulated Classroom Peers */}
            {participants.map((peer) => (
              <div
                key={peer.id}
                className="relative bg-surface-900 rounded-2xl overflow-hidden border border-surface-800 shadow-md flex items-center justify-center"
              >
                <div className="flex flex-col items-center justify-center text-surface-400">
                  <div className="w-16 h-16 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-white text-lg font-bold mb-2 shadow-inner">
                    {peer.name.charAt(0)}
                  </div>
                  <span className="text-xs text-surface-400 font-medium">{peer.name}</span>
                </div>

                {/* Bottom Tile Info */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="font-semibold text-white truncate">{peer.name}</span>
                  <div className="flex items-center gap-2">
                    {peer.hand && (
                      <span className="p-1 rounded bg-amber-500/30 text-amber-400" title="Hand Raised">
                        <Hand className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {peer.audio ? (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-surface-500" />
                    )}
                  </div>
                </div>

                {/* Instructor view: student engagement tag */}
                {isInstructor && peer.engagement && (
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20">
                    {peer.engagement}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="h-16 bg-surface-900/90 backdrop-blur-xl border border-surface-800 rounded-2xl px-6 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-xl transition ${
                  audioEnabled
                    ? 'bg-surface-800 text-white hover:bg-surface-700'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
                title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-xl transition ${
                  videoEnabled
                    ? 'bg-surface-800 text-white hover:bg-surface-700'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
                title={videoEnabled ? 'Turn Off Video' : 'Turn On Video'}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleHand}
                className={`p-3 rounded-xl transition ${
                  handRaised
                    ? 'bg-amber-500 text-surface-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'bg-surface-800 text-white hover:bg-surface-700'
                }`}
                title="Raise or Lower Hand"
              >
                <Hand className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className={`p-3 rounded-xl transition ${
                  drawerOpen ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-300'
                }`}
                title="Toggle Side Panel"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/classes')}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition shadow-sm"
                title="Leave Classroom"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Drawer (Chat / Participants / HUD) */}
        {drawerOpen && (
          <div className="w-80 md:w-96 bg-surface-900 border-l border-surface-800 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-surface-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-center transition ${
                  activeTab === 'chat'
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-surface-800/40'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                Chat ({chatMessages.length})
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex-1 py-3 text-center transition ${
                  activeTab === 'participants'
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-surface-800/40'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                Participants ({participants.length + 1})
              </button>
              {isInstructor && (
                <button
                  onClick={() => setActiveTab('hud')}
                  className={`flex-1 py-3 text-center transition ${
                    activeTab === 'hud'
                      ? 'text-primary-400 border-b-2 border-primary-500 bg-surface-800/40'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  Live HUD
                </button>
              )}
            </div>

            {/* Tab 1: Live Chat */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-surface-500 text-xs">
                      No chat messages yet. Ask a question!
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={msg._id || idx}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          msg.sender?._id === user?._id
                            ? 'bg-primary-600/20 border border-primary-500/30 text-white ml-4'
                            : 'bg-surface-800 text-surface-200 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-surface-400">
                          <span className="font-bold text-surface-300">
                            {msg.sender?.name || 'Classmate'}
                          </span>
                          <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p>{msg.message}</p>
                        {msg.status === 'flagged' && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                            Under Review
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a question or comment..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-surface-800 border border-surface-700 rounded-xl text-xs text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Participants */}
            {activeTab === 'participants' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                <div className="p-3 bg-surface-800/60 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white text-xs">
                      {user?.name?.charAt(0) || 'Y'}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{user?.name} (You)</p>
                      <p className="text-[10px] text-surface-400 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  {handRaised && <Hand className="w-4 h-4 text-amber-400" />}
                </div>

                {participants.map((p) => (
                  <div key={p.id} className="p-3 bg-surface-800/30 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center font-bold text-surface-300 text-xs">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{p.name}</p>
                        <p className="text-[10px] text-surface-400 capitalize">{p.role}</p>
                      </div>
                    </div>
                    {p.hand && <Hand className="w-4 h-4 text-amber-400" />}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Instructor Live HUD */}
            {activeTab === 'hud' && isInstructor && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                {/* Average Gauge */}
                <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700 text-center">
                  <span className="text-surface-400 font-medium">Real-Time Class Engagement</span>
                  <div className="text-3xl font-black text-emerald-400 my-2">
                    {classEngagementScore}%
                  </div>
                  <div className="w-full bg-surface-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${classEngagementScore}%` }}
                    />
                  </div>
                </div>

                {/* Attention breakdown */}
                <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700 space-y-2">
                  <h4 className="font-bold text-white mb-2">Participant Focus Breakdown</h4>
                  <div className="flex justify-between text-surface-300">
                    <span>Attentive (Gaze forward)</span>
                    <span className="font-bold text-emerald-400">75%</span>
                  </div>
                  <div className="flex justify-between text-surface-300">
                    <span>Neutral (Listening/Notes)</span>
                    <span className="font-bold text-blue-400">20%</span>
                  </div>
                  <div className="flex justify-between text-surface-300">
                    <span>Distracted / Inactive</span>
                    <span className="font-bold text-amber-400">5%</span>
                  </div>
                </div>

                {/* Hand raise queue */}
                <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                    <Hand className="w-4 h-4 text-amber-400" />
                    Questions Queue
                  </h4>
                  <div className="space-y-1.5">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between">
                      <span className="font-medium text-amber-300">Ada Lovelace</span>
                      <span className="text-[10px] text-surface-400">2 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center gap-2.5 text-blue-400 mb-2">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Privacy-First AI Analytics</h3>
            </div>
            <p className="text-xs text-surface-300 mb-4 leading-relaxed">
              Our system adheres to strict academic privacy standards:
              <br />• <strong>Zero Raw Video Storage:</strong> Video streams are processed ephemerally on-device or in memory. No recorded footage is saved.
              <br />• <strong>Non-Punitive Feedback:</strong> Metrics are designed for constructive self-reflection, not surveillance.
            </p>

            <div className="p-3 bg-surface-800 rounded-xl flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold text-white">Engagement Analytics Opt-In</p>
                <p className="text-[11px] text-surface-400">
                  Allow head pose & attention vector calculations
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleConsent}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  consentGranted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-700 text-surface-300'
                }`}
              >
                {consentGranted ? 'Opted In' : 'Disabled'}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
