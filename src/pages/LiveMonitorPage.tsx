import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { realtime } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { Exam, Attempt, Violation, ViolationType } from '../types';
import { demoSync } from '../demo/demoSync';
import { ViolationBadge } from '../components/ViolationBadge';
import { EvidenceModal } from '../components/EvidenceModal';
import { WebRTCViewer } from '../components/WebRTCViewer';
import { soundPlayer } from '../utils/audio';
import {
  MonitorPlay,
  Users,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Radio,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  Maximize2,
  Camera,
  RefreshCw,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const LiveMonitorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isDemo } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolationFilter, setSelectedViolationFilter] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active student inspection modal / drawer
  const [activeInspectedStudent, setActiveInspectedStudent] = useState<Attempt | null>(null);
  const [activeEvidenceViolation, setActiveEvidenceViolation] = useState<Violation | null>(null);

  // Screen/Webcam Stream View for selected student
  const [liveStreamStudent, setLiveStreamStudent] = useState<Attempt | null>(null);

  const loadData = async (examId?: string) => {
    try {
      const exList = await api.getExams();
      setExams(exList);
      const targetId = examId || searchParams.get('examId') || (exList[0] ? exList[0].id || exList[0]._id : '');
      if (targetId) {
        setSelectedExamId(targetId);
        const attList = await api.getMonitorAttempts(targetId);
        setAttempts(attList);
        if (isDemo) {
          const vList = demoSync.getViolations(targetId);
          setViolations(vList);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchParams]);

  // Real-time Socket / DemoSync connection
  useEffect(() => {
    if (!selectedExamId) return;

    const cleanup = realtime.connectTeacher(selectedExamId, (event, data) => {
      if (event === 'attempt_joined') {
        setAttempts((prev) => {
          const exists = prev.find((a) => a.id === data.id);
          return exists ? prev : [data, ...prev];
        });
      } else if (event === 'progress_update' || event === 'attempt_status') {
        setAttempts((prev) =>
          prev.map((a) => (a.id === data.id ? { ...a, ...data } : a))
        );
      } else if (event === 'violation_created') {
        if (soundEnabled) {
          soundPlayer.playViolationChime();
        }
        setViolations((prev) => [data, ...prev]);
        setAttempts((prev) =>
          prev.map((a) =>
            a.id === data.attemptId
              ? { ...a, violationCount: (a.violationCount || 0) + 1 }
              : a
          )
        );
      }
    });

    return () => {
      cleanup();
    };
  }, [selectedExamId, soundEnabled]);

  const activeExam = exams.find((e) => (e.id || e._id) === selectedExamId);

  // Filter candidates
  const filteredAttempts = attempts.filter((attempt) => {
    const matchesSearch =
      attempt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.rollNo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedViolationFilter === 'all') return true;
    if (selectedViolationFilter === 'violations_only') return attempt.violationCount > 0;
    if (selectedViolationFilter === 'clean_only') return attempt.violationCount === 0;
    if (selectedViolationFilter === 'offline_only') return !attempt.isOnline;

    // Check if candidate has specific violation type
    const candidateViolations = violations.filter((v) => v.attemptId === attempt.id);
    return candidateViolations.some((v) => v.type === selectedViolationFilter);
  });

  const activeCount = attempts.filter((a) => a.isOnline && a.status === 'in_progress').length;
  const flaggedCount = attempts.filter((a) => a.violationCount > 0).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Monitor Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <MonitorPlay className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Live Proctoring Room</h1>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[11px] font-bold">
                <Radio className="w-3 h-3 text-rose-600 animate-pulse" />
                <span>LIVE</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Exam: <span className="font-semibold text-slate-800">{activeExam?.title || 'Selected Assessment'}</span>
            </p>
          </div>
        </div>

        {/* Controls: Exam Selector + Sound Alert */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {exams.length > 1 && (
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                loadData(e.target.value);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              {exams.map((ex) => (
                <option key={ex.id || ex._id} value={ex.id || ex._id}>
                  {ex.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
            title={soundEnabled ? 'Chime sound on violation: ENABLED' : 'Chime sound: MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            onClick={() => loadData(selectedExamId)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh candidate roster"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Enrolled</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{attempts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5" />
            <span>Online & Active</span>
          </p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Flagged Candidates</span>
          </p>
          <p className="text-xl font-bold text-rose-700 tabular-nums mt-0.5">{flaggedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Incidents</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{violations.length}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Filter Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Candidates' },
            { id: 'violations_only', label: 'Flagged Only' },
            { id: 'tab_switch', label: 'Tab Switch' },
            { id: 'no_face', label: 'No Face' },
            { id: 'copy', label: 'Clipboard' },
            { id: 'devtools', label: 'DevTools' },
            { id: 'offline_only', label: 'Offline' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedViolationFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedViolationFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAttempts.map((attempt) => {
          const totalQ = activeExam?.questions.length || 10;
          const answeredQ = attempt.answers?.length || 0;
          const progressPct = Math.round((answeredQ / totalQ) * 100);
          const candidateViolations = violations.filter((v) => v.attemptId === attempt.id);
          const hasViolations = attempt.violationCount > 0;

          return (
            <div
              key={attempt.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                hasViolations
                  ? 'border-orange-300 hover:border-orange-400'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header: Status + Candidate Info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {attempt.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Roll: {attempt.rollNo}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {attempt.isOnline ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Online</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                        <WifiOff className="w-3 h-3 text-rose-600" />
                        <span>Offline</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 my-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>Progress ({answeredQ}/{totalQ} answered)</span>
                    <span className="tabular-nums font-bold">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Violations Summary Pill */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Flagged Incidents:</span>
                    <span
                      className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md ${
                        hasViolations
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {attempt.violationCount} {attempt.violationCount === 1 ? 'incident' : 'incidents'}
                    </span>
                  </div>

                  {/* Recent violation badges */}
                  {candidateViolations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {candidateViolations.slice(0, 2).map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setActiveEvidenceViolation(v)}
                          className="hover:scale-105 transition-transform"
                        >
                          <ViolationBadge type={v.type} size="sm" />
                        </button>
                      ))}
                      {candidateViolations.length > 2 && (
                        <span className="text-[10px] text-slate-400 self-center font-medium">
                          +{candidateViolations.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions: View Live Video Stream + Audit Trail */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setLiveStreamStudent(attempt)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Live Feed</span>
                </button>

                <Link
                  to={`/student/${attempt.id}`}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Open candidate audit report"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAttempts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
          No candidates match the active search or filter criteria.
        </div>
      )}

      {/* Live Video / Screen Inspection Modal */}
      {liveStreamStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setLiveStreamStudent(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col z-10 overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Live Stream: {liveStreamStudent.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Roll: {liveStreamStudent.rollNo} · {liveStreamStudent.institute}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLiveStreamStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Video Streams: Screen + Webcam via WebRTCViewer */}
            <div className="p-6 overflow-y-auto space-y-6">
              <WebRTCViewer
                attempt={liveStreamStudent}
                fallbackScreenUrl={
                  violations.find((v) => v.attemptId === liveStreamStudent.id)?.screenshotUrl ||
                  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'
                }
                fallbackWebcamUrl={
                  violations.find((v) => v.attemptId === liveStreamStudent.id)?.webcamUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
                }
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <Link
                to={`/student/${liveStreamStudent.id}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View Full Audit Report & Timeline →
              </Link>
              <button
                onClick={() => setLiveStreamStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Close Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Snapshot Modal */}
      <EvidenceModal
        violation={activeEvidenceViolation}
        onClose={() => setActiveEvidenceViolation(null)}
      />
    </div>
  );
};
