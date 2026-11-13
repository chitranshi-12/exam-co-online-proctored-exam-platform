/**
 * Unified API Client for exam.co
 * Gracefully switches between live Express Backend and in-browser Demo Engine.
 */

import { Exam, Attempt, Violation, ExamNotification, TeacherUser, EnrolledPublicExam } from '../types';
import { demoSync } from '../demo/demoSync';
import { DEMO_TEACHER } from '../demo/mockData';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private isDemoMode: boolean = true; // Defaults to true in sandbox for instant zero-config experience

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('exam_co_demo_mode');
      if (stored !== null) {
        this.isDemoMode = stored === 'true';
      }
    }
  }

  public setDemoMode(enabled: boolean) {
    this.isDemoMode = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('exam_co_demo_mode', enabled ? 'true' : 'false');
    }
  }

  public getIsDemoMode(): boolean {
    return this.isDemoMode;
  }

  public getTeacherToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('exam_co_teacher_jwt');
  }

  public setTeacherToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('exam_co_teacher_jwt', token);
    } else {
      localStorage.removeItem('exam_co_teacher_jwt');
    }
  }

  public getAttemptToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('exam_co_attempt_jwt');
  }

  public setAttemptToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('exam_co_attempt_jwt', token);
    } else {
      localStorage.removeItem('exam_co_attempt_jwt');
    }
  }

  // --- Auth ---
  public async signInWithGoogle(
    idToken?: string,
    profile?: { name?: string; email?: string; photo?: string }
  ): Promise<{ teacher: TeacherUser; token: string }> {
    if (this.isDemoMode || !idToken) {
      const teacher: TeacherUser = {
        id: 'teacher_google_2026',
        name: profile?.name || DEMO_TEACHER.name,
        email: profile?.email || DEMO_TEACHER.email,
        photo: profile?.photo || DEMO_TEACHER.photo,
      };
      const token = `jwt_teacher_${encodeURIComponent(teacher.email)}`;
      this.setTeacherToken(token);
      localStorage.setItem('exam_co_teacher_v1', JSON.stringify(teacher));
      return { teacher, token };
    }

    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Google Authentication failed');
    }

    const data = await res.json();
    this.setTeacherToken(data.token);
    return data;
  }

  public async getMe(): Promise<TeacherUser> {
    if (this.isDemoMode) {
      return DEMO_TEACHER;
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Not authenticated');
    return (await res.json()).teacher;
  }

  // --- Teacher Exams ---
  public async getExams(): Promise<Exam[]> {
    if (this.isDemoMode) {
      return demoSync.getExams();
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/exams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch exams');
    return (await res.json()).exams;
  }

  public async getExam(id: string): Promise<Exam> {
    if (this.isDemoMode) {
      const ex = demoSync.getExamById(id);
      if (!ex) throw new Error('Exam not found');
      return ex;
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Exam not found');
    return (await res.json()).exam;
  }

  public async createExam(examData: Partial<Exam>): Promise<Exam> {
    if (this.isDemoMode) {
      const newExam: Exam = {
        id: `ex-${Date.now().toString(36)}`,
        teacherId: DEMO_TEACHER.id,
        title: examData.title || 'Untitled Exam',
        institute: examData.institute || 'Institution',
        description: examData.description || '',
        examCode: examData.examCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
        durationMinutes: examData.durationMinutes || 60,
        startTime: examData.startTime,
        endTime: examData.endTime,
        requireFullscreen: examData.requireFullscreen ?? true,
        shuffleQuestions: examData.shuffleQuestions ?? false,
        status: examData.status || 'active',
        questions: examData.questions || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return demoSync.saveExam(newExam);
    }

    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(examData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create exam');
    }
    return (await res.json()).exam;
  }

  public async updateExam(id: string, examData: Partial<Exam>): Promise<Exam> {
    if (this.isDemoMode) {
      const existing = demoSync.getExamById(id);
      if (!existing) throw new Error('Exam not found');
      const updated = { ...existing, ...examData };
      return demoSync.saveExam(updated);
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(examData),
    });
    if (!res.ok) throw new Error('Failed to update exam');
    return (await res.json()).exam;
  }

  public async updateExamStatus(id: string, status: 'draft' | 'active' | 'closed'): Promise<Exam> {
    if (this.isDemoMode) {
      const existing = demoSync.getExamById(id);
      if (!existing) throw new Error('Exam not found');
      existing.status = status;
      return demoSync.saveExam(existing);
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/exams/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update exam status');
    return (await res.json()).exam;
  }

  // --- Public Student Endpoints ---
  public async getPublicExam(examId: string): Promise<EnrolledPublicExam> {
    if (this.isDemoMode) {
      const ex = demoSync.getExamById(examId);
      if (!ex) throw new Error('Exam not found');
      return {
        id: ex.id,
        title: ex.title,
        institute: ex.institute,
        description: ex.description,
        durationMinutes: ex.durationMinutes,
        requireFullscreen: ex.requireFullscreen,
        startTime: ex.startTime,
        endTime: ex.endTime,
        questionsCount: ex.questions.length,
      };
    }
    const res = await fetch(`${API_BASE}/public/exams/${examId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Exam not found or inactive');
    }
    return (await res.json()).exam;
  }

  public async enrollPublicExam(
    examId: string,
    formData: { name: string; rollNo: string; institute: string; email: string; examCode: string }
  ): Promise<{ attempt: Attempt; token: string; questions: Exam['questions']; deadlineAt?: string }> {
    if (this.isDemoMode) {
      const res = demoSync.enrollAttempt({ examId, ...formData });
      this.setAttemptToken(res.token);
      const ex = demoSync.getExamById(examId)!;
      // Strip correctIndex for student
      const sanitizedQuestions = ex.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        marks: q.marks,
      }));
      return {
        attempt: res.attempt,
        token: res.token,
        questions: sanitizedQuestions,
        deadlineAt: res.attempt.deadlineAt,
      };
    }

    const res = await fetch(`${API_BASE}/public/exams/${examId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Enrollment failed');
    }

    const data = await res.json();
    this.setAttemptToken(data.token);
    return data;
  }

  // --- Student Attempt Actions ---
  public async startAttempt(attemptId: string): Promise<Attempt> {
    if (this.isDemoMode) {
      return demoSync.startAttempt(attemptId);
    }
    const token = this.getAttemptToken();
    const res = await fetch(`${API_BASE}/attempts/${attemptId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to start attempt');
    return (await res.json()).attempt;
  }

  public async saveAttemptAnswer(
    attemptId: string,
    questionId: string,
    selectedIndex: number,
    markedForReview = false
  ): Promise<Attempt> {
    if (this.isDemoMode) {
      return demoSync.saveAnswer(attemptId, questionId, selectedIndex, markedForReview);
    }
    const token = this.getAttemptToken();
    const res = await fetch(`${API_BASE}/attempts/${attemptId}/answer`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ questionId, selectedIndex, markedForReview }),
    });
    if (!res.ok) throw new Error('Failed to save answer');
    return (await res.json()).attempt;
  }

  public async submitAttempt(attemptId: string): Promise<Attempt> {
    if (this.isDemoMode) {
      return demoSync.submitAttempt(attemptId);
    }
    const token = this.getAttemptToken();
    const res = await fetch(`${API_BASE}/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Submission failed');
    return (await res.json()).attempt;
  }

  public async sendAttemptHeartbeat(attemptId: string, isOnline = true) {
    if (this.isDemoMode) {
      demoSync.heartbeat(attemptId, isOnline);
      return;
    }
    const token = this.getAttemptToken();
    try {
      await fetch(`${API_BASE}/attempts/${attemptId}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isOnline }),
      });
    } catch {
      // offline heartbeat catch
    }
  }

  public async reportViolation(
    attemptId: string,
    examId: string,
    payload: {
      type: any;
      details?: string;
      screenshotDataUrl?: string;
      webcamDataUrl?: string;
      occurredAt?: string;
    }
  ): Promise<Violation> {
    if (this.isDemoMode) {
      return demoSync.recordViolation({
        attemptId,
        examId,
        type: payload.type,
        details: payload.details,
        screenshotUrl: payload.screenshotDataUrl,
        webcamUrl: payload.webcamDataUrl,
        occurredAt: payload.occurredAt,
      });
    }

    const token = this.getAttemptToken();
    const res = await fetch(`${API_BASE}/attempts/${attemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        examId,
        type: payload.type,
        details: payload.details,
        screenshotDataUrl: payload.screenshotDataUrl,
        webcamDataUrl: payload.webcamDataUrl,
        occurredAt: payload.occurredAt,
      }),
    });

    if (!res.ok) throw new Error('Failed to log violation');
    return (await res.json()).violation;
  }

  // --- Teacher Live Monitoring ---
  public async getMonitorAttempts(examId: string): Promise<Attempt[]> {
    if (this.isDemoMode) {
      return demoSync.getAttempts(examId);
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/monitor/exams/${examId}/attempts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch monitored attempts');
    return (await res.json()).attempts;
  }

  public async getMonitorAttemptDetail(attemptId: string): Promise<{ attempt: Attempt; violations: Violation[] }> {
    if (this.isDemoMode) {
      const attempt = demoSync.getAttemptById(attemptId);
      if (!attempt) throw new Error('Attempt not found');
      const violations = demoSync.getViolations(attempt.examId, attempt.id);
      return { attempt, violations };
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/monitor/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch attempt detail');
    return await res.json();
  }

  public async getNotifications(examId?: string): Promise<ExamNotification[]> {
    if (this.isDemoMode) {
      return demoSync.getNotifications(examId);
    }
    const token = this.getTeacherToken();
    const res = await fetch(`${API_BASE}/notifications?unread=false`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return (await res.json()).notifications;
  }

  public async markAllNotificationsRead(examId?: string) {
    if (this.isDemoMode) {
      demoSync.markAllNotificationsRead(examId);
      return;
    }
    const token = this.getTeacherToken();
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

export const api = new ApiService();
