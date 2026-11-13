/**
 * Socket.IO & Real-time Signaling Client
 * Bridges real Socket.IO connections or DemoSync channel seamlessly.
 */

import { io, Socket } from 'socket.io-client';
import { demoSync } from '../demo/demoSync';
import { api } from './api';

class RealtimeService {
  private socket: Socket | null = null;
  private unsubDemo: (() => void) | null = null;

  public connectTeacher(examId: string, onEvent: (eventName: string, data: any) => void): () => void {
    if (api.getIsDemoMode()) {
      // Connect to DemoSync event bus
      this.unsubDemo = demoSync.subscribe((msg) => {
        if (msg.type === 'ATTEMPT_ENROLLED') {
          onEvent('attempt_joined', msg.payload);
        } else if (msg.type === 'ATTEMPT_PROGRESS') {
          onEvent('progress_update', msg.payload);
        } else if (msg.type === 'ATTEMPT_HEARTBEAT') {
          onEvent('attempt_status', msg.payload);
        } else if (msg.type === 'VIOLATION_REPORTED') {
          onEvent('violation_created', msg.payload);
        } else if (msg.type === 'ATTEMPT_SUBMITTED') {
          onEvent('attempt_status', msg.payload);
        }
      });
      return () => {
        if (this.unsubDemo) this.unsubDemo();
      };
    }

    const token = api.getTeacherToken();
    const serverUrl = import.meta.env.VITE_WS_URL || window.location.origin;

    this.socket = io(serverUrl, {
      auth: { token, role: 'teacher', examId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('join_exam', { examId });
    });

    this.socket.on('attempt_joined', (data) => onEvent('attempt_joined', data));
    this.socket.on('attempt_status', (data) => onEvent('attempt_status', data));
    this.socket.on('violation_created', (data) => onEvent('violation_created', data));
    this.socket.on('notification', (data) => onEvent('notification', data));
    this.socket.on('progress_update', (data) => onEvent('progress_update', data));

    return () => {
      this.socket?.disconnect();
      this.socket = null;
    };
  }

  public connectStudent(attemptId: string, examId: string): {
    emitHeartbeat: (isOnline: boolean) => void;
    emitViolation: (violationData: any) => void;
    disconnect: () => void;
  } {
    if (api.getIsDemoMode()) {
      return {
        emitHeartbeat: (isOnline: boolean) => {
          demoSync.heartbeat(attemptId, isOnline);
        },
        emitViolation: (violationData: any) => {
          demoSync.recordViolation(violationData);
        },
        disconnect: () => {
          demoSync.heartbeat(attemptId, false);
        },
      };
    }

    const token = api.getAttemptToken();
    const serverUrl = import.meta.env.VITE_WS_URL || window.location.origin;

    const socket = io(serverUrl, {
      auth: { token, role: 'attempt', attemptId, examId },
      transports: ['websocket', 'polling'],
    });

    return {
      emitHeartbeat: (isOnline: boolean) => {
        socket.emit('heartbeat', { attemptId, isOnline, timestamp: new Date().toISOString() });
      },
      emitViolation: (violationData: any) => {
        socket.emit('violation', violationData);
      },
      disconnect: () => {
        socket.disconnect();
      },
    };
  }
}

export const realtime = new RealtimeService();
