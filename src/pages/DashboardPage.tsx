import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Exam, Attempt, Violation } from '../types';
import { demoSync } from '../demo/demoSync';
import { QRCodeModal } from '../components/QRCodeModal';
import { ViolationBadge } from '../components/ViolationBadge';
import { EvidenceModal } from '../components/EvidenceModal';
import {
  BookOpen,
  Users,
  AlertTriangle,
  Sparkles,
  PlusCircle,
  MonitorPlay,
  Share2,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  ExternalLink,
  ShieldAlert,
  Search,
  Camera,
  Monitor,
  Eye,
  Radio,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { teacher, isDemo } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedShareExam, setSelectedShareExam] = useState<Exam | null>(null);
  const [selectedEvidenceViolation, setSelectedEvidenceViolation] = useState<Violation | null>(null);
  const [simActive, setSimActive] = useState(false);

  // Violations table filtering & search
  const [violationSearch, setViolationSearch] = useState('');
  const [selectedViolationType, setSelectedViolationType] = useState<string>('all');

  const loadData = async () => {
    try {
      const exList = await api.getExams();
      setExams(exList);
      if (exList.length > 0) {
        const primaryExamId = exList[0].id || exList[0]._id;
        if (primaryExamId) {
          const attList = await api.getMonitorAttempts(primaryExamId);
          setAttempts(attList);
        }
      }
      // Always load all recent violations across active exams
      const allV = demoSync.getViolations();
      setViolations(allV);
    } catch (err) {
      console.warn('Dashboard load err:', err);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = demoSync.subscribe((msg) => {
      if (
        msg.type === 'ATTEMPT_ENROLLED' ||
        msg.type === 'ATTEMPT_PROGRESS' ||
        msg.type === 'VIOLATION_REPORTED' ||
        msg.type === 'ATTEMPT_SUBMITTED'
      ) {
        loadData();
      }
    });
    return unsub;
  }, [isDemo]);

  const toggleSimulation = () => {
    if (simActive) {
      demoSync.stopTrafficSimulation();
      setSimActive(false);
    } else {
      demoSync.startTrafficSimulation();
      setSimActive(true);
    }
  };

  const activeStudentsCount = attempts.filter((a) => a.isOnline && a.status === 'in_progress').length;
  const totalViolationsCount = violations.length;

  // Filtered violations for the dashboard table
  const filteredViolations = violations.filter((v) => {
    const studentName = v.studentName || '';
    const rollNo = v.rollNo || '';
    const matchesSearch =
      studentName.toLowerCase().includes(violationSearch.toLowerCase()) ||
      rollNo.toLowerCase().includes(violationSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedViolationType === 'all') return true;
    return v.type === selectedViolationType;
  });

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-200 font-bold">
            Teacher Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Welcome back, {teacher?.name || 'Professor'}
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
            Monitor real-time candidate integrity, inspect flagged evidence frames, and review assessment reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/exams/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Exam</span>
          </Link>

          {isDemo && (
            <button
              onClick={toggleSimulation}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${
                simActive
                  ? 'bg-amber-400 text-slate-900 border-amber-500 font-bold shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Simulates live candidates generating realistic test activity and violations"
            >
              {simActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{simActive ? 'Simulating Traffic...' : 'Simulate Candidates'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pastel Stat Cards (Strictly in pastel blue, green, orange, pink, purple) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Blue: Active Exams */}
        <div className="p-5 rounded-2xl bg-[#EFF6FF] border border-blue-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-3">
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-blue-700">Active Exams</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
            {exams.filter((e) => e.status === 'active').length}
          </p>
        </div>

        {/* Green: Total Students */}
        <div className="p-5 rounded-2xl bg-[#F0FDF4] border border-emerald-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-emerald-700">Total Candidates</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{attempts.length}</p>
        </div>

        {/* Orange: Incidents / Violations */}
        <div className="p-5 rounded-2xl bg-[#FFF7ED] border border-orange-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-3">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-orange-700">Flagged Incidents</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{totalViolationsCount}</p>
        </div>

        {/* Pink: Live Active Candidates */}
        <div className="p-5 rounded-2xl bg-[#FDF2F8] border border-pink-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center mb-3">
            <MonitorPlay className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-pink-700">Live & Connected</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">{activeStudentsCount}</p>
        </div>

        {/* Purple: Compliance Index */}
        <div className="p-5 rounded-2xl bg-[#FAF5FF] border border-purple-200/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-purple-700">Compliance Rate</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
            {attempts.length > 0
              ? `${Math.round(((attempts.length - attempts.filter((a) => a.violationCount > 2).length) / attempts.length) * 100)}%`
              : '100%'}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚨 DEDICATED LIVE VIOLATIONS TABLE (USER REQUESTED) */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Live Flagged Violations & Incidents</h2>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                  <Radio className="w-3 h-3 text-rose-600 animate-pulse" />
                  <span>REAL-TIME</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every suspicious activity intercepted during exams appears here with timestamped evidence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Total Flagged:</span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md tabular-nums">
              {violations.length} incidents
            </span>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter incidents by candidate name or roll..."
              value={violationSearch}
              onChange={(e) => setViolationSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Incidents' },
              { id: 'tab_switch', label: 'Tab Switch' },
              { id: 'no_face', label: 'No Face' },
              { id: 'audio_noise', label: 'Audio / Voice' },
              { id: 'copy', label: 'Clipboard' },
              { id: 'devtools', label: 'DevTools' },
              { id: 'fullscreen_exit', label: 'Fullscreen' },
              { id: 'offline', label: 'Offline' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedViolationType(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedViolationType === f.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Violations Table */}
        <div className="overflow-x-auto border border-slate-200/90 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Violation Type</th>
                <th className="py-3 px-4">Incident Diagnosis</th>
                <th className="py-3 px-4 text-center">Evidence Frames</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No violations match the criteria</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All candidate testing sessions are in compliance.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      <span className="font-semibold text-slate-700 block">
                        {new Date(v.occurredAt).toLocaleTimeString()}
                      </span>
                      <span className="text-slate-400 text-[10px]">{formatTime(v.occurredAt)}</span>
                    </td>

                    {/* Candidate */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            v.studentName || 'Student'
                          )}&backgroundColor=e0e7ff`}
                          alt="Avatar"
                          className="w-7 h-7 rounded-full border border-slate-200 bg-white"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{v.studentName || 'Candidate'}</p>
                          <p className="font-mono text-[11px] text-slate-500">Roll: {v.rollNo || 'N/A'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Violation Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <ViolationBadge type={v.type} size="sm" />
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={v.details}>
                      {v.details || 'Proctor telemetry flagged irregular activity'}
                    </td>

                    {/* Evidence Thumbnails */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {v.screenshotUrl ? (
                          <button
                            onClick={() => setSelectedEvidenceViolation(v)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 font-semibold text-[11px] transition-colors"
                            title="Inspect captured screen"
                          >
                            <Monitor className="w-3 h-3" />
                            <span>Screen</span>
                          </button>
                        ) : null}

                        {v.webcamUrl ? (
                          <button
                            onClick={() => setSelectedEvidenceViolation(v)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md border border-teal-200 font-semibold text-[11px] transition-colors"
                            title="Inspect webcam photo"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Webcam</span>
                          </button>
                        ) : null}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/student/${v.attemptId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors text-xs"
                      >
                        <span>Audit Log</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Content Split: Recent Exams + Quick Candidate Testing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exams List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Your Examinations</h2>
            <Link to="/exams" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View all exams →
            </Link>
          </div>

          <div className="space-y-3">
            {exams.map((exam) => (
              <div
                key={exam.id || exam._id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        exam.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exam.status === 'draft'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {exam.status}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{exam.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500">{exam.institute}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {exam.durationMinutes} mins
                    </span>
                    <span>{exam.questions.length} questions</span>
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">
                      Code: {exam.examCode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    onClick={() => setSelectedShareExam(exam)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Get Shareable Link & QR Code"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/monitor?examId=${exam.id || exam._id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    <span>Monitor Live</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Proctor Snapshot / Quick Links */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Quick Candidate Testing</h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                Test Flow
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Open the student flow to take the exam as a test candidate and see how silent detections are reported in real time to this teacher console.
            </p>
            {exams.length > 0 && (
              <button
                onClick={() => window.open(`/exam/${exams[0].id || exams[0]._id}`, '_blank')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Launch Student Flow in New Tab</span>
              </button>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Proctoring Rules Active
            </h4>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Camera, Screen, and Microphone verified upon entry</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Zero warnings or popups shown to students</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Offline queue synced via IndexedDB with original timestamps</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Screen & webcam evidence captured on incident trigger</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <QRCodeModal exam={selectedShareExam} onClose={() => setSelectedShareExam(null)} />
      <EvidenceModal
        violation={selectedEvidenceViolation}
        onClose={() => setSelectedEvidenceViolation(null)}
      />
    </div>
  );
};
