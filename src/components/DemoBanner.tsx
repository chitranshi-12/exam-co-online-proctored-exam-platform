import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ExternalLink, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { DEMO_EXAM } from '../demo/mockData';
import { demoSync } from '../demo/demoSync';

export const DemoBanner: React.FC = () => {
  const { isDemo, setDemoMode, isFirebaseReady } = useAuth();

  if (!isDemo) return null;

  const handleOpenStudentDemo = () => {
    // Open the actual student entry route for the demo exam
    window.open(`/exam/${DEMO_EXAM.id}`, '_blank');
  };

  const handleResetDemoData = () => {
    localStorage.removeItem('exam_co_exams_v1');
    localStorage.removeItem('exam_co_attempts_v1');
    localStorage.removeItem('exam_co_violations_v1');
    localStorage.removeItem('exam_co_notifications_v1');
    demoSync.initializeState();
    window.location.reload();
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 px-2 py-0.5 rounded font-bold tracking-wide uppercase text-[11px]">
            DEMO MODE
          </span>
          <span className="hidden sm:inline text-white/95">
            Running standalone with simulated live students and instant BroadcastChannel sync.
          </span>
          {!isFirebaseReady && (
            <span className="text-white/80 hidden md:inline text-xs">
              (Firebase/MongoDB not configured · Auto-fallback active)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenStudentDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-orange-700 hover:bg-orange-50 font-semibold rounded-md shadow-xs transition-colors"
            title="Open the real student test window in a new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open as Student (Demo)</span>
          </button>

          <button
            onClick={handleResetDemoData}
            className="p-1 hover:bg-white/10 rounded transition-colors text-white/90"
            title="Reset demo data to initial state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
