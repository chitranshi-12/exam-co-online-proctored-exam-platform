import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Exam, Attempt } from '../types';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Search,
  Award,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async (examId?: string) => {
    try {
      const exList = await api.getExams();
      setExams(exList);
      const targetId = examId || searchParams.get('examId') || (exList[0] ? exList[0].id || exList[0]._id : '');
      if (targetId) {
        setSelectedExamId(targetId);
        const attList = await api.getMonitorAttempts(targetId);
        setAttempts(attList);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const activeExam = exams.find((e) => (e.id || e._id) === selectedExamId);

  // Export Results CSV
  const handleExportCSV = () => {
    if (!activeExam) return;
    const headers = ['Rank', 'Roll Number', 'Name', 'Email', 'Institute', 'Score', 'Total Marks', 'Percentage', 'Status', 'Violations'];
    const sorted = [...attempts].sort((a, b) => (b.score || 0) - (a.score || 0));
    const rows = sorted.map((att, idx) => {
      const total = att.totalMarks || activeExam.questions.length || 10;
      const score = att.score || 0;
      const pct = Math.round((score / total) * 100);
      return [
        idx + 1,
        att.rollNo,
        `"${att.name}"`,
        att.email,
        `"${att.institute}"`,
        score,
        total,
        `${pct}%`,
        att.status,
        att.violationCount,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `results_${activeExam.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = attempts.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Assessment Results & Standings</h1>
            <p className="text-xs text-slate-500">
              Exam: <span className="font-semibold text-slate-800">{activeExam?.title || 'Selected Assessment'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-sm relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by student name or roll..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-hidden"
        />
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Integrity Flags</th>
                <th className="py-3 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((att, idx) => {
                const total = att.totalMarks || activeExam?.questions.length || 10;
                const score = att.score || 0;
                const pct = Math.round((score / total) * 100);

                return (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-500">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {att.name}
                      <span className="block text-[11px] font-normal text-slate-500">{att.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{att.rollNo}</td>
                    <td className="py-3.5 px-4">
                      {att.score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 tabular-nums">
                            {score} / {total}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {pct}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">In Progress</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`capitalize font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                          att.status === 'submitted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {att.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold tabular-nums px-2 py-0.5 rounded text-[11px] ${
                          att.violationCount > 0
                            ? 'bg-rose-50 text-rose-700 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {att.violationCount} incidents
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/student/${att.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <span>Audit Log</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
