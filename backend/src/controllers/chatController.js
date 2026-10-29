import { ChatMessage, ModerationEvent, ClassroomSession } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';

// Basic inappropriate words filter list
const BANNED_WORDS = [
  'spam',
  'abuse',
  'stupid',
  'idiot',
  'hate',
  'cheat',
  'kill',
  'scam',
  'trash',
  'curse',
];

const checkContentModeration = (content) => {
  const lower = content.toLowerCase();
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return {
        flagged: true,
        reason: `Matched prohibited term: ${word}`,
        severity: 'medium',
      };
    }
  }
  return { flagged: false };
};

/**
 * GET /api/chat/session/:sessionId
 * Get chat history for a session
 */
export const getSessionChatMessages = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const query = { sessionId };
    // Students only see approved messages or messages not flagged
    if (req.user.role === 'student') {
      query.status = { $ne: 'hidden' };
    }

    const messages = await ChatMessage.find(query)
      .populate('sender', 'name email avatar role')
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/session/:sessionId
 * Send a chat message with automated moderation check
 */
export const sendChatMessage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      throw new AppError('Message content cannot be empty', 400, 'EMPTY_MESSAGE');
    }

    const session = await ClassroomSession.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Call AI Moderation Service for ML classification
    let modResult = { flagged: false, severity: 'none', categories: [], toxicity_score: 0.0, confidence: 0.9 };
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const aiResponse = await fetch(`${config.aiServiceUrl}/api/v1/moderation/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.trim(),
          session_id: sessionId,
          sender_id: req.user._id.toString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (aiResponse.ok) {
        modResult = await aiResponse.json();
      } else {
        modResult = checkContentModeration(message);
      }
    } catch {
      modResult = checkContentModeration(message);
    }

    const status = modResult.flagged ? 'flagged' : 'visible';

    const chatMsg = await ChatMessage.create({
      sessionId,
      sender: req.user._id,
      message: message.trim(),
      status,
      flaggedReason: modResult.flagged
        ? `Flagged by NLP Classifier (${modResult.categories?.join(', ') || 'inappropriate'})`
        : null,
    });

    if (modResult.flagged) {
      const primaryCategory =
        modResult.categories?.find((c) =>
          ['toxic', 'insult', 'threat', 'harassment', 'hate', 'profanity'].includes(c)
        ) || 'other';

      await ModerationEvent.create({
        sessionId,
        sender: req.user._id,
        messageId: chatMsg._id,
        messageSnapshot: message.trim(),
        category: primaryCategory,
        severity: modResult.severity || 'medium',
        modelConfidence: modResult.confidence || 0.85,
        modelName: 'tfidf_logistic_nlp_v2',
        reviewStatus: 'pending',
      });

      // Emit real-time notification to instructor room via socket
      if (req.app?.locals?.io) {
        req.app.locals.io.to(`session:${sessionId}`).emit('moderation_event_created', {
          sessionId,
          senderName: req.user.name,
          category: primaryCategory,
          severity: modResult.severity,
          createdAt: new Date().toISOString(),
        });
      }
    }

    await chatMsg.populate('sender', 'name email avatar role');

    res.status(201).json({
      success: true,
      message: modResult.flagged ? 'Message flagged for instructor review' : 'Message posted',
      data: chatMsg,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/chat/message/:id/moderate
 * Instructor/admin hides or approves message
 */
export const moderateMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'hide' or 'approve'

    const chatMsg = await ChatMessage.findById(id);
    if (!chatMsg) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    chatMsg.status = action === 'hide' ? 'hidden' : 'visible';
    await chatMsg.save();

    res.json({
      success: true,
      message: `Message status updated to ${chatMsg.status}`,
      data: chatMsg,
    });
  } catch (error) {
    next(error);
  }
};
