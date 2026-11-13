/**
 * exam.co - Type Definitions
 */

export type ViolationType =
  | 'tab_switch'
  | 'window_blur'
  | 'offline'
  | 'online_restored'
  | 'fullscreen_exit'
  | 'screen_share_stopped'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'right_click'
  | 'print_screen'
  | 'devtools'
  | 'no_face'
  | 'multiple_faces'
  | 'audio_noise'
  | 'multiple_voices';

export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex?: number; // Never exposed to student during exam
  marks: number;
}

export type ExamStatus = 'draft' | 'active' | 'closed';

export interface Exam {
  id: string;
  _id?: string;
  teacherId: string;
  title: string;
  institute: string;
  description?: string;
  examCode: string;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  requireFullscreen: boolean;
  shuffleQuestions: boolean;
  status: ExamStatus;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export type AttemptStatus = 'enrolled' | 'in_progress' | 'submitted' | 'auto_submitted';

export interface StudentAnswer {
  questionId: string;
  selectedIndex: number;
  answeredAt?: string;
}

export interface Attempt {
  id: string;
  _id?: string;
  examId: string;
  name: string;
  rollNo: string;
  institute: string;
  email: string;
  startedAt?: string;
  deadlineAt?: string;
  submittedAt?: string;
  status: AttemptStatus;
  answers: StudentAnswer[];
  score?: number;
  totalMarks?: number;
  lastHeartbeat?: string;
  isOnline: boolean;
  socketId?: string;
  violationCount: number;
  markedForReview?: string[]; // questionIds
}

export interface Violation {
  id: string;
  _id?: string;
  attemptId: string;
  examId: string;
  studentName?: string;
  rollNo?: string;
  type: ViolationType;
  occurredAt: string;
  receivedAt?: string;
  details?: string;
  screenshotFileId?: string;
  screenshotUrl?: string;
  webcamFileId?: string;
  webcamUrl?: string;
}

export interface ExamNotification {
  id: string;
  _id?: string;
  teacherId: string;
  examId: string;
  attemptId: string;
  violationId?: string;
  studentName?: string;
  rollNo?: string;
  message: string;
  violationType?: ViolationType;
  read: boolean;
  createdAt: string;
}

export interface TeacherUser {
  id: string;
  _id?: string;
  firebaseUid?: string;
  name: string;
  email: string;
  photo?: string;
}

export interface EnrolledPublicExam {
  id: string;
  title: string;
  institute: string;
  description?: string;
  durationMinutes: number;
  requireFullscreen: boolean;
  startTime?: string;
  endTime?: string;
  questionsCount?: number;
}
