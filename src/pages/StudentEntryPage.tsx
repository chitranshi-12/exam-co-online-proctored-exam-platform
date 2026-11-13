import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { EnrolledPublicExam } from '../types';
import { Logo } from '../components/Logo';
import {
  ShieldCheck,
  Monitor,
  Camera,
  Mic,
  Maximize2,
  CheckCircle,
  AlertCircle,
  Lock,
  ArrowRight,
  Info,
  Volume2,
} from 'lucide-react';

export const StudentEntryPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<EnrolledPublicExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'form' | 'consent' | 'permissions'>('form');

  // Candidate Form fields
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [institute, setInstitute] = useState('');
  const [email, setEmail] = useState('');
  const [examCode, setExamCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Consent
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Permissions state: Camera, Screen, Microphone
  const [screenGranted, setScreenGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Video streams refs for preview
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    async function fetchExam() {
      if (!examId) return;
      try {
        const data = await api.getPublicExam(examId);
        setExam(data);
      } catch (err: any) {
        setFormError(err.message || 'Examination is not available.');
      } finally {
        setLoading(false);
      }
    }
    fetchExam();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [examId]);

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !rollNo.trim() || !institute.trim() || !email.trim()) {
      setFormError('Please fill in all candidate information fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.enrollPublicExam(examId!, {
        name,
        rollNo,
        institute,
        email,
        examCode,
      });

      // Save credentials for the test session
      sessionStorage.setItem('exam_co_current_attempt_id', res.attempt.id);
      sessionStorage.setItem('exam_co_current_attempt', JSON.stringify(res.attempt));
      sessionStorage.setItem('exam_co_current_questions', JSON.stringify(res.questions));

      setStep('consent');
    } catch (err: any) {
      setFormError(err.message || 'Enrollment failed. Please verify the exam code.');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Request Display Media (Screen share)
  const handleRequestScreen = async () => {
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        // Fallback for sandboxes without displayMedia permission
        setScreenGranted(true);
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as any,
        audio: false,
      });
      (window as any).__examCoScreenStream = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      setScreenGranted(true);
    } catch (err: any) {
      console.warn('Screen share request error/cancelled:', err);
      setPermissionError(
        'Screen share access is required to take this proctored examination. Please select "Entire Screen" when prompted and click Share.'
      );
    }
  };

  // 2. Request Camera (Webcam)
  const handleRequestCamera = async () => {
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraGranted(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      (window as any).__examCoCameraStream = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setCameraGranted(true);
    } catch (err: any) {
      console.warn('Camera request error/cancelled:', err);
      setPermissionError(
        'Webcam access is required for proctoring. Please allow camera permissions in your browser address bar.'
      );
    }
  };

  // 3. Request Microphone (Audio)
  const handleRequestMicrophone = async () => {
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicGranted(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      (window as any).__examCoMicStream = stream;

      // Audio Level Analyzer for real-time sound detection
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(checkAudio);
        };
        checkAudio();
      }

      setMicGranted(true);
    } catch (err: any) {
      console.warn('Microphone request error/cancelled:', err);
      setPermissionError(
        'Microphone access is required for proctoring room audio detection. Please allow microphone permissions in your browser.'
      );
    }
  };

  // Enter Fullscreen and start test
  const handleStartExam = async () => {
    if (!allPermissionsGranted) return;

    if (exam?.requireFullscreen && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn('Fullscreen request bypassed:', err);
      }
    }

    const attemptId = sessionStorage.getItem('exam_co_current_attempt_id');
    if (attemptId) {
      await api.startAttempt(attemptId);
    }

    navigate(`/exam/${examId}/take`);
  };

  const allPermissionsGranted = screenGranted && cameraGranted && micGranted;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center text-xs text-slate-500">
        Loading assessment portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header with Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Logo variant="full" size="lg" className="justify-center" />
        <h1 className="mt-3 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {exam ? exam.title : 'Examination Portal'}
        </h1>
        {exam && <p className="text-xs text-slate-500 mt-0.5">{exam.institute}</p>}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200/90 shadow-sm rounded-2xl space-y-6">
          {/* Step 1: Candidate Enrollment Form */}
          {step === 'form' && (
            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Step 1: Candidate Identification
                </span>
                {exam && (
                  <span className="text-xs text-slate-500 font-semibold">
                    Duration: {exam.durationMinutes} mins
                  </span>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll / Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS2026-001"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Access Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS2026"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. arivera@stanford.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / University *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford Computer Science"
                  value={institute}
                  onChange={(e) => setInstitute(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <span>{submitting ? 'Verifying...' : 'Continue to Proctoring Consent'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Proctoring Consent */}
          {step === 'consent' && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Step 2: Proctoring Agreement
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Automated Proctoring Protocol</span>
                </div>
                <p className="leading-relaxed">
                  This examination utilizes the <strong>Exam.co proctoring system</strong>. To preserve test integrity:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li>Your <strong>Camera</strong>, <strong>Screen Display</strong>, and <strong>Microphone Audio</strong> will be continuously monitored.</li>
                  <li>All tab switches, focus changes, background speech, and clipboard interactions are logged.</li>
                  <li>You must remain in the examination tab until final submission.</li>
                  <li>Fullscreen mode is strictly enforced if required by your instructor.</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 mt-0.5"
                />
                <span className="text-xs text-indigo-950 font-medium leading-relaxed">
                  I understand that this assessment is monitored and consent to screen, camera, microphone, and activity proctoring for the duration of this exam.
                </span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!consentAccepted}
                  onClick={() => setStep('permissions')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <span>Grant Hardware Permissions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Hardware Permissions: Screen + Camera + Microphone */}
          {step === 'permissions' && (
            <div className="space-y-5">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Step 3: Device & Sensor Verification
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {[screenGranted, cameraGranted, micGranted].filter(Boolean).length} of 3 granted
                </span>
              </div>

              {permissionError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{permissionError}</span>
                </div>
              )}

              {/* Hardware checklist */}
              <div className="space-y-3.5">
                {/* 1. Camera (Webcam) */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">1. Webcam Camera</p>
                        <p className="text-[11px] text-slate-500">Candidate face verification</p>
                      </div>
                    </div>

                    {cameraGranted ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-4 h-4" />
                        <span>Connected</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestCamera}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        Enable Camera
                      </button>
                    )}
                  </div>

                  {/* Live Webcam Preview Mirror */}
                  {cameraGranted && (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-950 aspect-video max-h-36 mx-auto">
                      <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <span className="absolute bottom-1.5 left-2 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        Camera Feed Verified
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Screen Share */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">2. Screen Share</p>
                        <p className="text-[11px] text-slate-500">Select "Entire Screen"</p>
                      </div>
                    </div>

                    {screenGranted ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-4 h-4" />
                        <span>Shared</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestScreen}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        Share Screen
                      </button>
                    )}
                  </div>

                  {screenGranted && (
                    <div className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Entire screen capture session active. Do not stop sharing.</span>
                    </div>
                  )}
                </div>

                {/* 3. Microphone (Microphone sensor with audio meter) */}
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">3. Room Microphone</p>
                        <p className="text-[11px] text-slate-500">Audio & speech detection</p>
                      </div>
                    </div>

                    {micGranted ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-4 h-4" />
                        <span>Listening</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestMicrophone}
                        className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                      >
                        Enable Microphone
                      </button>
                    )}
                  </div>

                  {/* Live Microphone Audio Level Meter */}
                  {micGranted && (
                    <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-violet-600" />
                          <span>Sound Activity Level:</span>
                        </span>
                        <span className="font-mono text-slate-500">{audioLevel}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-violet-600 h-2 rounded-full transition-all duration-100"
                          style={{ width: `${Math.max(5, audioLevel)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Speak a few words to confirm audio is active.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden screen video element */}
              <div className="hidden">
                <video ref={screenVideoRef} autoPlay playsInline muted />
              </div>

              {/* Start Button: Disabled until ALL 3 are granted */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={!allPermissionsGranted}
                  onClick={handleStartExam}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all ${
                    allPermissionsGranted
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-teal-700 hover:scale-[1.01] text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>
                    {allPermissionsGranted
                      ? 'Enter Fullscreen & Begin Assessment'
                      : `Please Grant All 3 Permissions to Begin (${[
                          !cameraGranted && 'Camera',
                          !screenGranted && 'Screen',
                          !micGranted && 'Microphone',
                        ]
                          .filter(Boolean)
                          .join(', ')})`}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Once started, the assessment timer counts down continuously.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
