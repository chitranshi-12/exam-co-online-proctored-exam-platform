/**
 * Demo Sync Service - Coordinates multi-tab real-time communication
 * via BroadcastChannel and localStorage, plus background event simulation.
 */

import { Exam, Attempt, Violation, ExamNotification, ViolationType } from '../types';
import {
  DEMO_EXAM,
  DEMO_TEACHER,
  INITIAL_DEMO_ATTEMPTS,
  createInitialDemoViolations,
  createInitialDemoNotifications,
} from './mockData';
import { generateSimulatedScreenEvidence, generateSimulatedWebcamEvidence } from '../utils/canvasHelper';
import { soundPlayer } from '../utils/audio';

const STORAGE_KEYS = {
  EXAMS: 'exam_co_exams_v1',
  ATTEMPTS: 'exam_co_attempts_v1',
  VIOLATIONS: 'exam_co_violations_v1',
  NOTIFICATIONS: 'exam_co_notifications_v1',
  ACTIVE_TEACHER: 'exam_co_teacher_v1',
  SIMULATION_ENABLED: 'exam_co_sim_enabled_v1',
};

type SyncEventType =
  | 'ATTEMPT_ENROLLED'
  | 'ATTEMPT_PROGRESS'
  | 'ATTEMPT_HEARTBEAT'
  | 'VIOLATION_REPORTED'
  | 'ATTEMPT_SUBMITTED'
  | 'EXAM_UPDATED'
  | 'NOTIFICATION_READ_ALL';

interface SyncMessage {
  type: SyncEventType;
  payload: any;
  timestamp: string;
}

type SyncListener = (event: SyncMessage) => void;

class DemoSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncListener> = new Set();
  private simTimer: any = null;

  constructor() {
    this.initializeState();
    this.initBroadcastChannel();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('exam_co_sync_channel');
        this.channel.onmessage = (ev) => {
          this.handleIncomingMessage(ev.data);
        };
      } catch {
        // Fallback for restricted sandboxes
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'exam_co_sync_event_pulse' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleIncomingMessage(data);
          } catch {
            // parse error catch
          }
        }
      });
    }
  }

  private handleIncomingMessage(msg: SyncMessage) {
    if (!msg || !msg.type) return;
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public broadcast(type: SyncEventType, payload: any) {
    const msg: SyncMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // channel error catch
      }
    }
    // Also trigger storage event for cross-tab sync
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('exam_co_sync_event_pulse', JSON.stringify({ ...msg, _rand: Math.random() }));
      } catch {
        // storage catch
      }
    }
    // Invoke local listeners
    this.handleIncomingMessage(msg);
  }

  public initializeState() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.EXAMS)) {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify([DEMO_EXAM]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(INITIAL_DEMO_ATTEMPTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VIOLATIONS)) {
      localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(createInitialDemoViolations()));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(createInitialDemoNotifications()));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_TEACHER)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TEACHER, JSON.stringify(DEMO_TEACHER));
    }
  }

  // --- Exams API ---
  public getExams(): Exam[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
      return data ? JSON.parse(data) : [DEMO_EXAM];
    } catch {
      return [DEMO_EXAM];
    }
  }

  public getExamById(id: string): Exam | null {
    const exams = this.getExams();
    return exams.find((e) => e.id === id || e._id === id) || null;
  }

  public saveExam(exam: Exam): Exam {
    const exams = this.getExams();
    const idx = exams.findIndex((e) => e.id === exam.id || e._id === exam.id);
    if (idx >= 0) {
      exams[idx] = { ...exams[idx], ...exam, updatedAt: new Date().toISOString() };
    } else {
      exams.unshift(exam);
    }
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    this.broadcast('EXAM_UPDATED', exam);
    return exam;
  }

  // --- Attempts API ---
  public getAttempts(examId?: string): Attempt[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
      const attempts: Attempt[] = data ? JSON.parse(data) : INITIAL_DEMO_ATTEMPTS;
      return examId ? attempts.filter((a) => a.examId === examId) : attempts;
    } catch {
      return INITIAL_DEMO_ATTEMPTS;
    }
  }

  public getAttemptById(id: string): Attempt | null {
    const attempts = this.getAttempts();
    return attempts.find((a) => a.id === id || a._id === id) || null;
  }

  public enrollAttempt(data: {
    examId: string;
    name: string;
    rollNo: string;
    institute: string;
    email: string;
    examCode: string;
  }): { attempt: Attempt; token: string } {
    const exam = this.getExamById(data.examId);
    if (!exam) throw new Error('Exam not found');
    if (exam.status !== 'active') throw new Error('This exam is currently not active');
    if (exam.examCode && exam.examCode.trim().toUpperCase() !== data.examCode.trim().toUpperCase()) {
      throw new Error('Incorrect Exam Access Code');
    }

    const attempts = this.getAttempts(data.examId);
    const existing = attempts.find(
      (a) =>
        a.rollNo.trim().toLowerCase() === data.rollNo.trim().toLowerCase() ||
        a.email.trim().toLowerCase() === data.email.trim().toLowerCase()
    );
    if (existing) {
      if (existing.status === 'submitted' || existing.status === 'auto_submitted') {
        throw new Error('This candidate has already submitted this examination');
      }
      return { attempt: existing, token: `demo_tok_${existing.id}` };
    }

    const newAttempt: Attempt = {
      id: `att-real-${Date.now().toString(36)}`,
      examId: data.examId,
      name: data.name.trim(),
      rollNo: data.rollNo.trim(),
      institute: data.institute.trim(),
      email: data.email.trim(),
      status: 'enrolled',
      answers: [],
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
      violationCount: 0,
      markedForReview: [],
    };

    const allAttempts = this.getAttempts();
    allAttempts.push(newAttempt);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(allAttempts));

    this.broadcast('ATTEMPT_ENROLLED', newAttempt);
    return { attempt: newAttempt, token: `demo_tok_${newAttempt.id}` };
  }

  public startAttempt(attemptId: string, durationMinutes = 45): Attempt {
    const allAttempts = this.getAttempts();
    const idx = allAttempts.findIndex((a) => a.id === attemptId);
    if (idx < 0) throw new Error('Attempt not found');

    const startedAt = new Date().toISOString();
    const deadlineAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    allAttempts[idx].status = 'in_progress';
    allAttempts[idx].startedAt = startedAt;
    allAttempts[idx].deadlineAt = deadlineAt;
    allAttempts[idx].lastHeartbeat = startedAt;
    allAttempts[idx].isOnline = true;

    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(allAttempts));
    this.broadcast('ATTEMPT_PROGRESS', allAttempts[idx]);
    return allAttempts[idx];
  }

  public saveAnswer(attemptId: string, questionId: string, selectedIndex: number, markedForReview = false): Attempt {
    const allAttempts = this.getAttempts();
    const idx = allAttempts.findIndex((a) => a.id === attemptId);
    if (idx < 0) throw new Error('Attempt not found');

    const attempt = allAttempts[idx];
    const ansIdx = attempt.answers.findIndex((ans) => ans.questionId === questionId);
    if (ansIdx >= 0) {
      attempt.answers[ansIdx].selectedIndex = selectedIndex;
      attempt.answers[ansIdx].answeredAt = new Date().toISOString();
    } else {
      attempt.answers.push({
        questionId,
        selectedIndex,
        answeredAt: new Date().toISOString(),
      });
    }

    const reviewSet = new Set(attempt.markedForReview || []);
    if (markedForReview) {
      reviewSet.add(questionId);
    } else {
      reviewSet.delete(questionId);
    }
    attempt.markedForReview = Array.from(reviewSet);
    attempt.lastHeartbeat = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(allAttempts));
    this.broadcast('ATTEMPT_PROGRESS', attempt);
    return attempt;
  }

  public heartbeat(attemptId: string, isOnline = true) {
    const allAttempts = this.getAttempts();
    const idx = allAttempts.findIndex((a) => a.id === attemptId);
    if (idx >= 0) {
      const prevOnline = allAttempts[idx].isOnline;
      allAttempts[idx].lastHeartbeat = new Date().toISOString();
      allAttempts[idx].isOnline = isOnline;
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(allAttempts));
      if (prevOnline !== isOnline) {
        this.broadcast('ATTEMPT_HEARTBEAT', allAttempts[idx]);
      }
    }
  }

  public submitAttempt(attemptId: string): Attempt {
    const allAttempts = this.getAttempts();
    const idx = allAttempts.findIndex((a) => a.id === attemptId);
    if (idx < 0) throw new Error('Attempt not found');

    const attempt = allAttempts[idx];
    const exam = this.getExamById(attempt.examId);

    // Calculate score
    let score = 0;
    let totalMarks = 0;
    if (exam) {
      totalMarks = exam.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      attempt.answers.forEach((ans) => {
        const q = exam.questions.find((quest) => quest.id === ans.questionId);
        if (q && q.correctIndex !== undefined && q.correctIndex === ans.selectedIndex) {
          score += q.marks || 1;
        }
      });
    }

    attempt.status = 'submitted';
    attempt.submittedAt = new Date().toISOString();
    attempt.score = score;
    attempt.totalMarks = totalMarks || 10;

    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(allAttempts));
    this.broadcast('ATTEMPT_SUBMITTED', attempt);
    return attempt;
  }

  // --- Violations & Evidence API ---
  public getViolations(examId?: string, attemptId?: string): Violation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VIOLATIONS);
      const list: Violation[] = data ? JSON.parse(data) : [];
      return list.filter((v) => {
        if (examId && v.examId !== examId) return false;
        if (attemptId && v.attemptId !== attemptId) return false;
        return true;
      });
    } catch {
      return [];
    }
  }

  public recordViolation(payload: {
    attemptId: string;
    examId: string;
    type: ViolationType;
    details?: string;
    screenshotUrl?: string;
    webcamUrl?: string;
    occurredAt?: string;
  }): Violation {
    const attempt = this.getAttemptById(payload.attemptId);
    const violation: Violation = {
      id: `v-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      attemptId: payload.attemptId,
      examId: payload.examId,
      studentName: attempt ? attempt.name : 'Unknown Candidate',
      rollNo: attempt ? attempt.rollNo : 'N/A',
      type: payload.type,
      occurredAt: payload.occurredAt || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      details: payload.details,
      screenshotUrl: payload.screenshotUrl || generateSimulatedScreenEvidence(attempt?.name || 'Student', payload.type),
      webcamUrl: payload.webcamUrl || generateSimulatedWebcamEvidence(attempt?.name || 'Student', payload.type === 'no_face' ? 'no_face' : payload.type === 'multiple_faces' ? 'multiple_faces' : 'normal'),
    };

    // Save violation
    const list = this.getViolations();
    list.unshift(violation);
    localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(list));

    // Increment attempt violation count
    if (attempt) {
      const allAttempts = this.getAttempts();
      const idx = allAttempts.findIndex((a) => a.id === attempt.id);
      if (idx >= 0) {
        allAttempts[idx].violationCount = (allAttempts[idx].violationCount || 0) + 1;
        localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(allAttempts));
      }
    }

    // Create teacher notification
    this.createNotification({
      teacherId: DEMO_TEACHER.id,
      examId: payload.examId,
      attemptId: payload.attemptId,
      violationId: violation.id,
      studentName: violation.studentName,
      rollNo: violation.rollNo,
      message: `${violation.studentName} triggered: ${this.getViolationLabel(payload.type)}`,
      violationType: payload.type,
    });

    // Play subtle audio alert on teacher side
    soundPlayer.playViolationChime();

    // Broadcast real-time event
    this.broadcast('VIOLATION_REPORTED', violation);
    return violation;
  }

  public getNotifications(examId?: string): ExamNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const list: ExamNotification[] = data ? JSON.parse(data) : [];
      return examId ? list.filter((n) => n.examId === examId) : list;
    } catch {
      return [];
    }
  }

  public createNotification(data: Omit<ExamNotification, 'id' | 'createdAt' | 'read'>): ExamNotification {
    const list = this.getNotifications();
    const notif: ExamNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    list.unshift(notif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    return notif;
  }

  public markAllNotificationsRead(examId?: string) {
    const list = this.getNotifications();
    list.forEach((n) => {
      if (!examId || n.examId === examId) {
        n.read = true;
      }
    });
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    this.broadcast('NOTIFICATION_READ_ALL', { examId });
  }

  // --- Background Student Traffic Simulator ---
  public startTrafficSimulation() {
    if (this.simTimer) return;
    this.simTimer = setInterval(() => {
      this.triggerRandomSimulationEvent();
    }, 14000);
  }

  public stopTrafficSimulation() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }

  private triggerRandomSimulationEvent() {
    const attempts = this.getAttempts(DEMO_EXAM.id).filter((a) => a.status === 'in_progress');
    if (attempts.length === 0) return;

    const student = attempts[Math.floor(Math.random() * attempts.length)];
    const violationTypes: ViolationType[] = [
      'tab_switch',
      'window_blur',
      'no_face',
      'copy',
      'fullscreen_exit',
      'multiple_faces',
    ];
    const pickedType = violationTypes[Math.floor(Math.random() * violationTypes.length)];

    const detailsMap: Record<ViolationType, string> = {
      tab_switch: 'Browser tab became hidden. Student switched to an external tab.',
      window_blur: 'Window focus lost. Clicked outside active browser viewport.',
      offline: 'Network heartbeat dropped.',
      online_restored: 'Network connection re-established.',
      fullscreen_exit: 'Candidate exited required fullscreen window mode.',
      screen_share_stopped: 'Screen share display stream was terminated by user.',
      copy: 'Clipboard copy event detected on question prompt.',
      paste: 'Clipboard paste attempt intercepted.',
      cut: 'Clipboard cut command intercepted.',
      right_click: 'Context menu right-click attempt prevented.',
      print_screen: 'PrintScreen shortcut pressed.',
      devtools: 'Developer Tools console shortcut inspected.',
      no_face: 'No human face detected in candidate camera frame.',
      multiple_faces: 'Two or more faces identified in camera frame.',
      audio_noise: 'Acoustic sensor flagged speaking, whisper or room voice activity.',
      multiple_voices: 'Multiple distinct voices detected by acoustic frequency analyzer.',
    };

    this.recordViolation({
      attemptId: student.id,
      examId: DEMO_EXAM.id,
      type: pickedType,
      details: detailsMap[pickedType],
    });
  }

  public getViolationLabel(type: ViolationType): string {
    const labels: Record<ViolationType, string> = {
      tab_switch: 'Tab Switch',
      window_blur: 'Window Blur',
      offline: 'Offline / Disconnected',
      online_restored: 'Online Restored',
      fullscreen_exit: 'Fullscreen Exit',
      screen_share_stopped: 'Screen Share Stopped',
      copy: 'Copy Attempt',
      paste: 'Paste Attempt',
      cut: 'Cut Attempt',
      right_click: 'Right Click',
      print_screen: 'Print Screen',
      devtools: 'DevTools Inspection',
      no_face: 'No Face in Webcam',
      multiple_faces: 'Multiple Faces Detected',
      audio_noise: 'Voice / Audio Detected',
      multiple_voices: 'Multiple Voices',
    };
    return labels[type] || type;
  }
}

export const demoSync = new DemoSyncManager();
