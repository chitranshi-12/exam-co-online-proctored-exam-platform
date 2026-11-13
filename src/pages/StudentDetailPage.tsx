import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Attempt, Violation, Exam } from '../types';
import { ViolationBadge } from '../components/ViolationBadge';
import { EvidenceModal } from '../components/EvidenceModal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  User,
  CheckCircle,
  AlertTriangle,
  Award,
  Layers,
  ExternalLink,
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const res = await api.getMonitorAttemptDetail(id);
        setAttempt(res.attempt);
        setViolations(res.violations);
        if (res.attempt.examId) {
          const ex = await api.getExam(res.attempt.examId);
          setExam(ex);
        }
      } catch (err) {
        console.warn('Failed to load attempt details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading candidate audit report...</div>;
  }

  if (!attempt) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-slate-600 text-sm">Candidate attempt not found.</p>
        <button
          onClick={() => navigate('/monitor')}
          className="text-xs text-indigo-600 font-semibold"
        >
          Return to Live Monitor
        </button>
      </div>
    );
  }

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Student Name', attempt.name],
      ['Roll Number', attempt.rollNo],
      ['Institute', attempt.institute],
      ['Email', attempt.email],
      ['Status', attempt.status],
      ['Score', `${attempt.score || 0} / ${attempt.totalMarks || exam?.questions.length || 10}`],
      ['Total Violations', attempt.violationCount.toString()],
      [],
      ['Timestamp', 'Violation Type', 'Details'],
      ...violations.map((v) => [v.occurredAt, v.type, v.details || '']),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_report_${attempt.rollNo}_${attempt.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Printable Audit Report (PDF format via Browser Print engine)
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors print:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Candidate Integrity Audit Report
            </h1>
            <p className="text-xs text-slate-500">
              Exam: {exam?.title || 'Examination'} · {exam?.institute}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Print / PDF Report</span>
          </button>
        </div>
      </div>

      {/* Candidate Profile Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Candidate</span>
          <h2 className="text-base font-bold text-slate-900 mt-1">{attempt.name}</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{attempt.email}</p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Identifiers</span>
          <p className="text-sm font-semibold text-slate-800 mt-1">Roll No: {attempt.rollNo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{attempt.institute}</p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assessment Result</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {attempt.score !== undefined ? `${attempt.score} / ${attempt.totalMarks || 10}` : 'In Progress'}
            </span>
            {attempt.score !== undefined && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {Math.round(((attempt.score || 0) / (attempt.totalMarks || 10)) * 100)}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 capitalize mt-0.5">Status: {attempt.status.replace('_', ' ')}</p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Compliance Summary</span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-sm font-bold px-2.5 py-0.5 rounded-md ${
                attempt.violationCount === 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {attempt.violationCount} Violations Logged
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {attempt.violationCount === 0 ? 'Verified clean session' : 'Suspicious incidents flagged'}
          </p>
        </div>
      </div>

      {/* Answers Breakdown */}
      {attempt.answers && attempt.answers.length > 0 && exam && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Questions & Responses ({attempt.answers.length} answered)</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {exam.questions.map((q, idx) => {
              const studentAns = attempt.answers.find((a) => a.questionId === q.id);
              const isCorrect =
                studentAns && q.correctIndex !== undefined && studentAns.selectedIndex === q.correctIndex;

              return (
                <div key={q.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800">
                      Q{idx + 1}. {q.text}
                    </p>
                    {studentAns ? (
                      <p className="text-slate-600">
                        Selected: <span className="font-semibold">{q.options[studentAns.selectedIndex]}</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">Unanswered</p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {studentAns ? (
                      isCorrect ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          +{q.marks || 1}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                          0
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chronological Violation Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span>Incident Timeline ({violations.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of proctoring events with captured screen and camera evidence frames.
            </p>
          </div>
        </div>

        {violations.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Zero Violations Recorded</p>
            <p className="text-xs text-slate-400 mt-0.5">
              No unauthorized tab switches, window blurs, or face drops were observed during this attempt.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {violations.map((v, idx) => (
              <div key={v.id} className="relative group">
                {/* Timeline node dot */}
                <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-xs" />

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <ViolationBadge type={v.type} size="sm" />
                      <span className="text-xs font-semibold text-slate-800">Incident #{idx + 1}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(v.occurredAt).toLocaleTimeString()} ({new Date(v.occurredAt).toLocaleDateString()})</span>
                    </span>
                  </div>

                  {v.details && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100">
                      {v.details}
                    </p>
                  )}

                  {/* Evidence Thumbnails */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {v.screenshotUrl && (
                      <div
                        onClick={() => setSelectedViolation(v)}
                        className="cursor-pointer group/thumb relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video"
                      >
                        <img
                          src={v.screenshotUrl}
                          alt="Screen Evidence"
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 group-hover/thumb:bg-slate-900/10 flex items-center justify-center transition-colors">
                          <span className="text-[10px] bg-slate-900/80 text-white font-semibold px-2 py-0.5 rounded">
                            View Screen Evidence
                          </span>
                        </div>
                      </div>
                    )}

                    {v.webcamUrl && (
                      <div
                        onClick={() => setSelectedViolation(v)}
                        className="cursor-pointer group/thumb relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video"
                      >
                        <img
                          src={v.webcamUrl}
                          alt="Webcam Evidence"
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 group-hover/thumb:bg-slate-900/10 flex items-center justify-center transition-colors">
                          <span className="text-[10px] bg-slate-900/80 text-white font-semibold px-2 py-0.5 rounded">
                            View Webcam Snapshot
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EvidenceModal
        violation={selectedViolation}
        onClose={() => setSelectedViolation(null)}
      />
    </div>
  );
};
