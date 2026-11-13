import React, { useEffect } from 'react';
import { Logo } from '../components/Logo';
import confetti from 'canvas-confetti';
import { CheckCircle2, ShieldCheck, Clock, Award } from 'lucide-react';

export const StudentSubmittedPage: React.FC = () => {
  const submittedTimestamp =
    sessionStorage.getItem('exam_co_submitted_timestamp') || new Date().toISOString();

  useEffect(() => {
    // Gentle celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#14B8A6', '#F97316', '#FACC15'],
      });
    } catch {
      // Ignore
    }

    // Stop active camera/screen/microphone media tracks
    const screenStream = (window as any).__examCoScreenStream as MediaStream | undefined;
    const cameraStream = (window as any).__examCoCameraStream as MediaStream | undefined;
    const micStream = (window as any).__examCoMicStream as MediaStream | undefined;
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto text-center space-y-6">
        <Logo variant="full" size="xl" className="justify-center" />

        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs space-y-5 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Exam Submitted Successfully
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Your assessment responses and proctoring telemetry have been securely recorded.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Submission Timestamp:</span>
              <span className="font-mono font-semibold text-slate-800">
                {new Date(submittedTimestamp).toLocaleTimeString()} ({new Date(submittedTimestamp).toLocaleDateString()})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Proctoring Status:</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified & Uploaded</span>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            You may now safely close this browser window or tab.
          </p>
        </div>
      </div>
    </div>
  );
};
