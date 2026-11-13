import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { realtime } from '../services/socket';
import { Question, Attempt, ViolationType } from '../types';
import { Logo } from '../components/Logo';
import {
  queueOfflineViolation,
  getPendingOfflineViolations,
  markOfflineViolationsSynced,
} from '../services/indexedDb';
import {
  captureVideoFrame,
  generateSimulatedScreenEvidence,
  generateSimulatedWebcamEvidence,
} from '../utils/canvasHelper';
import {
  Clock,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Check,
  Send,
} from 'lucide-react';

export const StudentExamPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  // Attempt & Questions state
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  // Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45 * 60);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Hidden proctor media streams
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  // Anti-spam debounce map for silent violations
  const lastViolationTimes = useRef<Record<string, number>>({});
  const heartbeatTimer = useRef<any>(null);

  // Load session from storage
  useEffect(() => {
    const rawAttempt = sessionStorage.getItem('exam_co_current_attempt');
    const rawQuestions = sessionStorage.getItem('exam_co_current_questions');

    if (rawAttempt && rawQuestions) {
      try {
        const att: Attempt = JSON.parse(rawAttempt);
        const qList: Question[] = JSON.parse(rawQuestions);
        setAttempt(att);
        setQuestions(qList);

        // Populate existing answers if any
        const initialAns: Record<string, number> = {};
        att.answers?.forEach((a) => {
          initialAns[a.questionId] = a.selectedIndex;
        });
        setAnswers(initialAns);

        if (att.markedForReview) {
          setMarkedForReview(new Set(att.markedForReview));
        }

        // Initialize deadline timer
        if (att.deadlineAt) {
          const diff = Math.floor((new Date(att.deadlineAt).getTime() - Date.now()) / 1000);
          setSecondsRemaining(Math.max(0, diff));
        }
      } catch (err) {
        console.warn('Session parse error:', err);
      }
    } else {
      // If refreshed without session, navigate back to entry
      navigate(`/exam/${examId}`);
    }
  }, [examId, navigate]);

  // Attach persistent media streams to video elements
  useEffect(() => {
    const screenStream = (window as any).__examCoScreenStream as MediaStream | undefined;
    const cameraStream = (window as any).__examCoCameraStream as MediaStream | undefined;

    if (screenStream && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
      screenStream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          triggerSilentViolation('screen_share_stopped', 'Screen sharing stream ended by candidate');
        });
      });
    }

    if (cameraStream && cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = cameraStream;
    }

    // Attach microphone stream and silently detect voice/talking incidents
    const micStream = (window as any).__examCoMicStream as MediaStream | undefined;
    let audioCleanup: (() => void) | null = null;
    if (micStream) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(micStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let sustainedSoundTicks = 0;

          const audioCheckTimer = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            if (avg > 42) {
              sustainedSoundTicks++;
              if (sustainedSoundTicks >= 3) {
                triggerSilentViolation(
                  'audio_noise',
                  'Acoustic sensor flagged speaking, whisper or room voice activity'
                );
                sustainedSoundTicks = 0;
              }
            } else {
              sustainedSoundTicks = Math.max(0, sustainedSoundTicks - 1);
            }
          }, 800);

          audioCleanup = () => {
            clearInterval(audioCheckTimer);
            audioCtx.close().catch(() => {});
          };
        }
      } catch (err) {
        console.warn('Audio sensor monitor error:', err);
      }
    }

    return () => {
      if (audioCleanup) audioCleanup();
    };
  }, []);

  // 1. SILENT VIOLATION TRIGGER & EVIDENCE CAPTURE (NO USER POPUPS EVER)
  const triggerSilentViolation = async (type: ViolationType, details?: string) => {
    if (!attempt || !examId) return;

    // Debounce violation type to avoid spamming 100 events in 1 second
    const now = Date.now();
    const lastTime = lastViolationTimes.current[type] || 0;
    if (now - lastTime < 3500) {
      return; // Ignore duplicate within 3.5s
    }
    lastViolationTimes.current[type] = now;

    // Capture compressed evidence frames
    let screenDataUrl = '';
    let webcamDataUrl = '';

    if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
      screenDataUrl = captureVideoFrame(screenVideoRef.current, attempt.rollNo);
    }
    if (cameraVideoRef.current && cameraVideoRef.current.readyState >= 2) {
      webcamDataUrl = captureVideoFrame(cameraVideoRef.current, attempt.name);
    }

    // Fallbacks if browser restricts capture
    if (!screenDataUrl) {
      screenDataUrl = generateSimulatedScreenEvidence(attempt.name, type, currentQuestionIndex + 1);
    }
    if (!webcamDataUrl) {
      webcamDataUrl = generateSimulatedWebcamEvidence(
        attempt.name,
        type === 'no_face' ? 'no_face' : type === 'multiple_faces' ? 'multiple_faces' : 'normal'
      );
    }

    const payload = {
      attemptId: attempt.id,
      examId,
      type,
      details: details || `Silent proctor trigger: ${type}`,
      screenshotDataUrl: screenDataUrl,
      webcamDataUrl: webcamDataUrl,
      occurredAt: new Date().toISOString(),
    };

    if (navigator.onLine) {
      try {
        await api.reportViolation(attempt.id, examId, payload);
      } catch (err) {
        // Fallback to IndexedDB queue if request fails
        await queueOfflineViolation({
          id: `queue-${Date.now()}-${Math.random()}`,
          attemptId: attempt.id,
          examId,
          type,
          details: payload.details,
          screenshotDataUrl: screenDataUrl,
          webcamDataUrl: webcamDataUrl,
          occurredAt: payload.occurredAt,
          synced: false,
        });
      }
    } else {
      // Device is offline: save in IndexedDB
      await queueOfflineViolation({
        id: `queue-${Date.now()}-${Math.random()}`,
        attemptId: attempt.id,
        examId,
        type,
        details: payload.details,
        screenshotDataUrl: screenDataUrl,
        webcamDataUrl: webcamDataUrl,
        occurredAt: payload.occurredAt,
        synced: false,
      });
    }
  };

  // Sync IndexedDB offline violations when network is restored
  const syncOfflineQueue = async () => {
    if (!attempt || !examId) return;
    try {
      const pending = await getPendingOfflineViolations();
      if (pending.length === 0) return;

      const syncedIds: string[] = [];
      for (const item of pending) {
        await api.reportViolation(attempt.id, examId, {
          type: item.type as ViolationType,
          details: item.details,
          screenshotDataUrl: item.screenshotDataUrl,
          webcamDataUrl: item.webcamDataUrl,
          occurredAt: item.occurredAt,
        });
        syncedIds.push(item.id);
      }
      await markOfflineViolationsSynced(syncedIds);
    } catch (err) {
      console.warn('Error syncing offline queue:', err);
    }
  };

  // 2. SILENT EVENT LISTENERS (Strictly silent as required by §10)
  useEffect(() => {
    if (!attempt) return;

    // Visibility Change (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerSilentViolation('tab_switch', 'Candidate switched to another browser tab or minimized window');
      }
    };

    // Window Blur (Window focus lost / application switch)
    const handleWindowBlur = () => {
      triggerSilentViolation('window_blur', 'Window lost focus. Candidate navigated to an external application');
    };

    // Online & Offline Events
    const handleOnline = () => {
      triggerSilentViolation('online_restored', 'Candidate network connection re-established');
      syncOfflineQueue();
    };

    const handleOffline = () => {
      triggerSilentViolation('offline', 'Network connection disconnected');
    };

    // Fullscreen Exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerSilentViolation('fullscreen_exit', 'Candidate exited fullscreen mode');
      }
    };

    // Clipboard Copy / Cut / Paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerSilentViolation('copy', 'Clipboard copy command attempted');
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerSilentViolation('cut', 'Clipboard cut command attempted');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerSilentViolation('paste', 'Clipboard paste command attempted');
    };

    // Right Click (Prevent context menu and log silently)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerSilentViolation('right_click', 'Context menu right-click intercepted');
    };

    // Keydown for DevTools & PrintScreen shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        triggerSilentViolation('print_screen', 'PrintScreen key pressed');
      }

      // F12 or DevTools shortcuts
      const isDevTools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u'));

      if (isDevTools) {
        e.preventDefault();
        triggerSilentViolation('devtools', 'Developer Tools inspection shortcut pressed');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [attempt]);

  // 3. HEARTBEAT & COUNTDOWN TIMER
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Heartbeat every 5s
    heartbeatTimer.current = setInterval(() => {
      if (attempt) {
        api.sendAttemptHeartbeat(attempt.id, navigator.onLine);
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [attempt]);

  // Answer selection & autosave
  const handleSelectOption = async (optionIndex: number) => {
    if (!currQ || !attempt) return;
    const qId = currQ.id;
    const newAnswers = { ...answers, [qId]: optionIndex };
    setAnswers(newAnswers);

    // Autosave to API & DemoSync
    try {
      await api.saveAttemptAnswer(
        attempt.id,
        qId,
        optionIndex,
        markedForReview.has(qId)
      );
    } catch (err) {
      console.warn('Autosave answer failed:', err);
    }
  };

  // Toggle Mark For Review
  const toggleReview = async () => {
    if (!currQ || !attempt) return;
    const qId = currQ.id;
    const newReview = new Set(markedForReview);
    if (newReview.has(qId)) {
      newReview.delete(qId);
    } else {
      newReview.add(qId);
    }
    setMarkedForReview(newReview);

    const currentSelected = answers[qId] !== undefined ? answers[qId] : -1;
    if (currentSelected >= 0) {
      await api.saveAttemptAnswer(attempt.id, qId, currentSelected, newReview.has(qId));
    }
  };

  // Auto-submit when time expires
  const handleAutoSubmit = async () => {
    if (!attempt) return;
    try {
      await api.submitAttempt(attempt.id);
      sessionStorage.setItem('exam_co_submitted_timestamp', new Date().toISOString());
      navigate(`/exam/${examId}/submitted`);
    } catch (err) {
      console.warn('Auto-submit error:', err);
      navigate(`/exam/${examId}/submitted`);
    }
  };

  // Final Manual Submit
  const handleConfirmSubmit = async () => {
    if (!attempt) return;
    setSubmitting(true);
    try {
      await api.submitAttempt(attempt.id);
      sessionStorage.setItem('exam_co_submitted_timestamp', new Date().toISOString());
      navigate(`/exam/${examId}/submitted`);
    } catch (err: any) {
      alert(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currQ = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  // Format Timer MM:SS
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsRemaining < 300; // < 5 mins

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col select-none">
      {/* Hidden media capture elements */}
      <div className="hidden">
        <video ref={screenVideoRef} autoPlay playsInline muted />
        <video ref={cameraVideoRef} autoPlay playsInline muted />
      </div>

      {/* Top Test Header: Logo, Candidate Info, Colorful Timer Chip, Submit Button */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo variant="full" size="sm" />
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <p className="text-xs font-bold text-slate-800">{attempt?.name}</p>
              <p className="text-[11px] text-slate-400 font-mono">Roll: {attempt?.rollNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Colorful Timer Chip */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono font-bold text-sm shadow-xs transition-colors ${
                isLowTime
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>

            {/* Finish & Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Exam Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Content (3 Cols) */}
        <div className="lg:col-span-3 space-y-5">
          {currQ && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-semibold">
                    Marks: +{currQ.marks || 1}
                  </span>

                  <button
                    onClick={toggleReview}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      markedForReview.has(currQ.id)
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>
                      {markedForReview.has(currQ.id) ? 'Marked for Review' : 'Mark for Review'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed">
                {currQ.text}
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currQ.options.map((opt, optIdx) => {
                  const isSelected = answers[currQ.id] === optIdx;
                  const letter = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : letter}
                      </div>

                      <div className="flex-1 text-xs sm:text-sm text-slate-800 leading-snug pt-0.5">
                        {opt}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 shadow-xs transition-colors"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Question Navigator Sidebar (1 Col) */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Question Navigator
            </h3>

            {/* Status Legend as requested in §3 */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-200 border border-slate-300" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-600" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500" />
                <span>Review</span>
              </div>
            </div>

            {/* Grid of Question buttons */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = currentQuestionIndex === idx;
                const isAnswered = answers[q.id] !== undefined;
                const isReview = markedForReview.has(q.id);

                let colorClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                if (isCurrent) {
                  colorClass = 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400';
                } else if (isReview) {
                  colorClass = 'bg-amber-500 text-white font-bold';
                } else if (isAnswered) {
                  colorClass = 'bg-emerald-500 text-white font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${colorClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-bold text-slate-800">
                  {answeredCount} / {totalQuestions}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Flagged for Review:</span>
                <span className="font-bold text-amber-600">{markedForReview.size}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Dialog */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowSubmitModal(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 border border-slate-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Examination?</h3>
                <p className="text-xs text-slate-500">You are about to finalize your answers.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>Answered Questions:</span>
                <span className="font-bold text-emerald-600">
                  {answeredCount} of {totalQuestions}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Unanswered Questions:</span>
                <span className="font-bold text-slate-500">
                  {totalQuestions - answeredCount}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Marked for Review:</span>
                <span className="font-bold text-amber-600">{markedForReview.size}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Once submitted, your session will be locked and you will not be able to change any answers.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
              >
                Back to Exam
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
