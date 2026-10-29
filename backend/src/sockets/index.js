import { Server } from 'socket.io';
import { config } from '../config/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { User, ClassroomSession, ChatMessage, ModerationEvent } from '../models/index.js';

// In-memory room state: Map of sessionId -> Map of socketId -> participant info
const roomParticipants = new Map();

/**
 * Initialize Socket.IO with WebRTC signaling, classroom presence, and real-time analytics.
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket authentication middleware (optional token handshake)
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.headers?.cookie?.match(/accessToken=([^;]+)/)?.[1];

      if (token) {
        try {
          const decoded = verifyAccessToken(token);
          const user = await User.findById(decoded.id).select('name email role avatar');
          if (user) {
            socket.user = user;
          }
        } catch {
          // Token expired or invalid; socket may proceed as guest or handle in event
        }
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket) => {
    let currentSessionId = null;

    // Join classroom session room
    socket.on('join_session', async ({ sessionId, userProfile }, callback) => {
      try {
        currentSessionId = sessionId;
        socket.join(`session:${sessionId}`);

        const participant = {
          socketId: socket.id,
          userId: socket.user?._id?.toString() || userProfile?.id || socket.id,
          name: socket.user?.name || userProfile?.name || 'Anonymous Student',
          role: socket.user?.role || userProfile?.role || 'student',
          audioEnabled: true,
          videoEnabled: true,
          handRaised: false,
          joinedAt: new Date(),
        };

        if (!roomParticipants.has(sessionId)) {
          roomParticipants.set(sessionId, new Map());
        }

        const sessionMap = roomParticipants.get(sessionId);
        sessionMap.set(socket.id, participant);

        const currentParticipants = Array.from(sessionMap.values());

        // Notify other participants in session
        socket.to(`session:${sessionId}`).emit('participant_joined', participant);

        // Acknowledge back with current room participants list
        if (typeof callback === 'function') {
          callback({
            success: true,
            participants: currentParticipants,
          });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Leave classroom session room
    socket.on('leave_session', ({ sessionId }) => {
      const targetSession = sessionId || currentSessionId;
      if (targetSession && roomParticipants.has(targetSession)) {
        const sessionMap = roomParticipants.get(targetSession);
        const participant = sessionMap.get(socket.id);
        sessionMap.delete(socket.id);

        socket.to(`session:${targetSession}`).emit('participant_left', {
          socketId: socket.id,
          userId: participant?.userId,
        });

        socket.leave(`session:${targetSession}`);
        currentSessionId = null;
      }
    });

    // Toggle media state (mic / video / screen)
    socket.on('toggle_media', ({ sessionId, type, enabled }) => {
      const targetSession = sessionId || currentSessionId;
      if (targetSession && roomParticipants.has(targetSession)) {
        const sessionMap = roomParticipants.get(targetSession);
        const p = sessionMap.get(socket.id);
        if (p) {
          if (type === 'audio') p.audioEnabled = enabled;
          if (type === 'video') p.videoEnabled = enabled;
          io.to(`session:${targetSession}`).emit('participant_updated', p);
        }
      }
    });

    // Raise / lower hand
    socket.on('raise_hand', ({ sessionId, raised }) => {
      const targetSession = sessionId || currentSessionId;
      if (targetSession && roomParticipants.has(targetSession)) {
        const sessionMap = roomParticipants.get(targetSession);
        const p = sessionMap.get(socket.id);
        if (p) {
          p.handRaised = Boolean(raised);
          io.to(`session:${targetSession}`).emit('participant_updated', p);
        }
      }
    });

    // WebRTC Signaling: offer, answer, ice-candidate
    socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc_offer', {
        callerSocketId: socket.id,
        offer,
      });
    });

    socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc_answer', {
        callerSocketId: socket.id,
        answer,
      });
    });

    socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc_ice_candidate', {
        callerSocketId: socket.id,
        candidate,
      });
    });

    // Live Classroom Chat Message
    socket.on('chat_message', async ({ sessionId, message, userProfile }) => {
      const targetSession = sessionId || currentSessionId;
      if (!targetSession || !message) return;

      const payload = {
        _id: new Date().getTime().toString(),
        sessionId: targetSession,
        sender: {
          _id: socket.user?._id || userProfile?.id,
          name: socket.user?.name || userProfile?.name || 'User',
          role: socket.user?.role || userProfile?.role || 'student',
        },
        message: message.trim(),
        createdAt: new Date().toISOString(),
        status: 'visible',
      };

      // Broadcast to everyone in room
      io.to(`session:${targetSession}`).emit('chat_message_received', payload);
    });

    // Live Engagement Metric Telemetry (from student client to instructor HUD)
    socket.on('live_engagement_metric', ({ sessionId, metric }) => {
      const targetSession = sessionId || currentSessionId;
      if (!targetSession) return;

      // Broadcast live metric to room (instructors aggregate this for live HUD)
      socket.to(`session:${targetSession}`).emit('student_engagement_update', {
        socketId: socket.id,
        userId: socket.user?._id || metric?.studentId,
        score: metric?.score || 0,
        state: metric?.state || 'attentive',
        timestamp: new Date().toISOString(),
      });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      if (currentSessionId && roomParticipants.has(currentSessionId)) {
        const sessionMap = roomParticipants.get(currentSessionId);
        const participant = sessionMap.get(socket.id);
        sessionMap.delete(socket.id);

        socket.to(`session:${currentSessionId}`).emit('participant_left', {
          socketId: socket.id,
          userId: participant?.userId,
        });
      }
    });
  });

  console.log('✅ Real-time Virtual Classroom Socket.IO signaling ready');
  return io;
};

export default initializeSocket;
