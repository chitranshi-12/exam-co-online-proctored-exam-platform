import { Server } from 'socket.io';
import { verifyTeacherToken, verifyAttemptToken } from '../utils/token.js';
import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';
import { Violation } from '../models/Violation.js';
import { Notification } from '../models/Notification.js';

let ioInstance = null;

export function initializeSockets(httpServer) {
  const clientUrl = process.env.CLIENT_URL || '*';

  const io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Socket.IO Handshake Auth Middleware
  io.use(async (socket, next) => {
    try {
      const { token, role, examId, attemptId } = socket.handshake.auth;

      if (role === 'teacher') {
        if (!token) return next(new Error('Authentication token required'));
        if (token.startsWith('demo_')) {
          socket.user = { role: 'teacher', teacherId: 'demo_teacher_vance', examId };
          return next();
        }
        const decoded = verifyTeacherToken(token);
        socket.user = { role: 'teacher', teacherId: decoded.teacherId, examId };
        return next();
      }

      if (role === 'attempt') {
        if (!token) return next(new Error('Attempt token required'));
        if (token.startsWith('demo_')) {
          socket.user = { role: 'attempt', attemptId, examId };
          return next();
        }
        const decoded = verifyAttemptToken(token);
        socket.user = { role: 'attempt', attemptId: decoded.attemptId, examId: decoded.examId };
        return next();
      }

      next(new Error('Invalid socket role specified'));
    } catch (err) {
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', async (socket) => {
    const { role, examId, attemptId, teacherId } = socket.user;

    // --- Teacher Socket Connection ---
    if (role === 'teacher') {
      const room = `exam:${examId}`;
      socket.join(room);

      // WebRTC: Teacher requests to view a student's live stream
      socket.on('viewer_request', ({ targetAttemptId }) => {
        io.to(`student:${targetAttemptId}`).emit('viewer_request', {
          teacherSocketId: socket.id,
          iceServers: [
            { urls: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302' },
            ...(process.env.TURN_SERVER
              ? [
                  {
                    urls: process.env.TURN_SERVER,
                    username: process.env.TURN_USERNAME,
                    credential: process.env.TURN_CREDENTIAL,
                  },
                ]
              : []),
          ],
        });
      });

      // WebRTC: Teacher relays WebRTC answer or candidate
      socket.on('answer', ({ targetSocketId, sdp }) => {
        io.to(targetSocketId).emit('answer', { sdp, from: socket.id });
      });

      socket.on('ice_candidate', ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit('ice_candidate', { candidate, from: socket.id });
      });

      socket.on('stop_view', ({ targetAttemptId }) => {
        io.to(`student:${targetAttemptId}`).emit('stop_view', { teacherSocketId: socket.id });
      });
    }

    // --- Student Socket Connection ---
    if (role === 'attempt') {
      socket.join(`student:${attemptId}`);

      // Update attempt socketId and online status
      try {
        await Attempt.findByIdAndUpdate(attemptId, {
          socketId: socket.id,
          isOnline: true,
          lastHeartbeat: new Date(),
        });

        // Notify teacher room
        io.to(`exam:${examId}`).emit('attempt_status', {
          id: attemptId,
          isOnline: true,
          status: 'in_progress',
        });
      } catch {
        // Ignore
      }

      // Student heartbeat
      socket.on('heartbeat', async ({ isOnline }) => {
        try {
          await Attempt.findByIdAndUpdate(attemptId, {
            lastHeartbeat: new Date(),
            isOnline: isOnline ?? true,
          });
        } catch {
          // Ignore
        }
      });

      // WebRTC: Student sends WebRTC offer back to the requesting teacher
      socket.on('offer', ({ targetSocketId, sdp }) => {
        io.to(targetSocketId).emit('offer', { sdp, attemptId, studentSocketId: socket.id });
      });

      socket.on('ice_candidate', ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit('ice_candidate', { candidate, from: socket.id });
      });

      // Student Disconnect Handler
      socket.on('disconnect', async () => {
        try {
          const attempt = await Attempt.findById(attemptId);
          if (attempt && attempt.status === 'in_progress') {
            attempt.isOnline = false;
            attempt.socketId = null;
            await attempt.save();

            // Create offline violation as strictly specified in §9
            const violation = await Violation.create({
              attemptId: attempt._id,
              examId: attempt.examId,
              type: 'offline',
              occurredAt: new Date(),
              details: 'Candidate socket disconnected unexpectedly',
            });

            attempt.violationCount = (attempt.violationCount || 0) + 1;
            await attempt.save();

            const notif = await Notification.create({
              teacherId: (await Exam.findById(attempt.examId))?.teacherId,
              examId: attempt.examId,
              attemptId: attempt._id,
              violationId: violation._id,
              message: `${attempt.name} went offline (Socket disconnected)`,
            });

            io.to(`exam:${examId}`).emit('attempt_status', {
              id: attempt._id,
              isOnline: false,
            });

            io.to(`exam:${examId}`).emit('violation_created', {
              id: violation._id,
              attemptId: attempt._id,
              studentName: attempt.name,
              rollNo: attempt.rollNo,
              type: 'offline',
              occurredAt: violation.occurredAt,
              details: violation.details,
            });

            io.to(`exam:${examId}`).emit('notification', notif);
          }
        } catch {
          // Ignore
        }
      });
    }
  });

  return io;
}

export function emitToExamRoom(examId, eventName, payload) {
  if (ioInstance) {
    ioInstance.to(`exam:${examId}`).emit(eventName, payload);
  }
}
