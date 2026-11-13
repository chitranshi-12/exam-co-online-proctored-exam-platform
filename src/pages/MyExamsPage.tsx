import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Exam } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';
import {
  BookOpen,
  PlusCircle,
  Share2,
  MonitorPlay,
  BarChart3,
  Clock,
  KeyRound,
  CheckCircle,
  XCircle,
  Layers,
} from 'lucide-react';

export const MyExamsPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShareExam, setSelectedShareExam] = useState<Exam | null>(null);

  const loadExams = async () => {
    try {
      const list = await api.getExams();
      setExams(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const toggleStatus = async (exam: Exam) => {
    const nextStatus = exam.status === 'active' ? 'closed' : 'active';
    await api.updateExamStatus(exam.id || exam._id!, nextStatus);
    loadExams();
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">My Examinations</h1>
          <p className="text-xs text-slate-500">Manage your published assessments, links, and access controls.</p>
        </div>
        <Link
          to="/exams/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Exam</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Loading examinations...</div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No examinations created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first proctored test to generate shareable links and monitor students in real time.
          </p>
          <Link
            to="/exams/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Create an Exam
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => {
            const examId = exam.id || exam._id!;
            return (
              <div
                key={examId}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
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

                    <button
                      onClick={() => toggleStatus(exam)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      {exam.status === 'active' ? 'Close Exam' : 'Activate'}
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{exam.institute}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.durationMinutes} mins</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.questions.length} questions</span>
                    </span>
                    <span className="flex items-center gap-1.5 col-span-2 font-mono text-[11px] text-slate-500">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Code: {exam.examCode}</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedShareExam(exam)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Get Shareable Link & QR Code"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/results?examId=${examId}`}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Exam Results"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Link>

                    <Link
                      to={`/monitor?examId=${examId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <MonitorPlay className="w-3.5 h-3.5" />
                      <span>Live Monitor</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QRCodeModal exam={selectedShareExam} onClose={() => setSelectedShareExam(null)} />
    </div>
  );
};
