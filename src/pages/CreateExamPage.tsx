import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Exam, Question } from '../types';
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Save,
  Shuffle,
  Maximize2,
  KeyRound,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export const CreateExamPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [institute, setInstitute] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [examCode, setExamCode] = useState(() =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-1',
      text: 'What is the primary characteristic of an idempotent REST API operation?',
      options: [
        'It requires no authentication headers',
        'Multiple identical requests have the exact same effect as a single request',
        'It always returns HTTP status 200 OK',
        'It cannot be cached by intermediate proxies',
      ],
      correctIndex: 1,
      marks: 1,
    },
  ]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [csvError, setCsvError] = useState<string | null>(null);

  const generateNewExamCode = () => {
    setExamCode(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      marks: 1,
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, index - 1));
  };

  const handleUpdateCurrentQuestion = (field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[activeQuestionIndex] = {
      ...updated[activeQuestionIndex],
      [field]: value,
    };
    setQuestions(updated);
  };

  const handleUpdateOption = (optIndex: number, text: string) => {
    const updated = [...questions];
    const currentOpts = [...updated[activeQuestionIndex].options] as [string, string, string, string];
    currentOpts[optIndex] = text;
    updated[activeQuestionIndex].options = currentOpts;
    setQuestions(updated);
  };

  // CSV Import Parser
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setCsvError('CSV must contain a header row and at least one question.');
          return;
        }

        // Expected format: question, optionA, optionB, optionC, optionD, correct, marks
        const parsedQuestions: Question[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 6) {
            let correctIdx = 0;
            const correctVal = cols[5].toUpperCase();
            if (correctVal === 'B' || correctVal === '1') correctIdx = 1;
            else if (correctVal === 'C' || correctVal === '2') correctIdx = 2;
            else if (correctVal === 'D' || correctVal === '3') correctIdx = 3;

            parsedQuestions.push({
              id: `q-csv-${i}`,
              text: cols[0],
              options: [cols[1] || '', cols[2] || '', cols[3] || '', cols[4] || ''],
              correctIndex: correctIdx,
              marks: cols[6] ? parseInt(cols[6], 10) || 1 : 1,
            });
          }
        }

        if (parsedQuestions.length > 0) {
          setQuestions(parsedQuestions);
          setActiveQuestionIndex(0);
        } else {
          setCsvError('Could not parse questions. Ensure columns: question,optionA,optionB,optionC,optionD,correct,marks');
        }
      } catch (err: any) {
        setCsvError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveExam = async (status: 'active' | 'draft' = 'active') => {
    if (!title.trim()) {
      alert('Please provide an Exam Title.');
      return;
    }
    if (!institute.trim()) {
      alert('Please specify the Institution or Department.');
      return;
    }

    setLoading(true);
    try {
      const created = await api.createExam({
        title,
        institute,
        description,
        durationMinutes,
        examCode,
        requireFullscreen,
        shuffleQuestions,
        status,
        questions,
      });
      navigate(`/monitor?examId=${created.id || created._id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  const currQ = questions[activeQuestionIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create New Examination</h1>
            <p className="text-xs text-slate-500">Configure proctoring parameters and build assessment questions.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSaveExam('draft')}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSaveExam('active')}
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Publish & Activate</span>
          </button>
        </div>
      </div>

      {/* Basic Settings Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. General Exam Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. CS 201: Algorithms & Data Structures Final"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Institute / Department *</label>
            <input
              type="text"
              required
              placeholder="e.g. Stanford University School of Engineering"
              value={institute}
              onChange={(e) => setInstitute(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Instructions</label>
            <textarea
              rows={2}
              placeholder="Provide instructions visible to students before taking the test..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Duration (Minutes)</span>
            </label>
            <input
              type="number"
              min={5}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Exam Access Code</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={generateNewExamCode}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* Proctoring Rules Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
            <input
              type="checkbox"
              checked={requireFullscreen}
              onChange={(e) => setRequireFullscreen(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Enforce Fullscreen Mode</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Silently flags violations if candidate exits fullscreen window.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-teal-600" />
                <span>Shuffle Question Order</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Randomizes question sequence independently for each enrolled student.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              2. Assessment Questions ({questions.length})
            </h2>
            <p className="text-xs text-slate-500">Add multiple choice questions or import via CSV.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* CSV Import */}
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
            </label>

            <button
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {csvError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {csvError}
          </div>
        )}

        {/* Question Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setActiveQuestionIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                activeQuestionIndex === idx
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Q{idx + 1}
            </button>
          ))}
        </div>

        {/* Question Editor */}
        {currQ && (
          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                Question {activeQuestionIndex + 1}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Marks:</span>
                  <input
                    type="number"
                    min={1}
                    value={currQ.marks || 1}
                    onChange={(e) =>
                      handleUpdateCurrentQuestion('marks', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-14 px-2 py-1 bg-white border border-slate-200 rounded text-center text-xs"
                  />
                </div>
                {questions.length > 1 && (
                  <button
                    onClick={() => handleDeleteQuestion(activeQuestionIndex)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Question Statement
              </label>
              <textarea
                rows={3}
                placeholder="Type the question prompt here..."
                value={currQ.text}
                onChange={(e) => handleUpdateCurrentQuestion('text', e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* 4 Options */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                Options (Select the radio button for the correct answer)
              </label>
              {currQ.options.map((opt, optIdx) => {
                const isCorrect = currQ.correctIndex === optIdx;
                const letter = String.fromCharCode(65 + optIdx);
                return (
                  <div
                    key={optIdx}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                      isCorrect ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${currQ.id}`}
                      checked={isCorrect}
                      onChange={() => handleUpdateCurrentQuestion('correctIndex', optIdx)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span
                      className={`text-xs font-bold w-5 ${
                        isCorrect ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {letter}.
                    </span>
                    <input
                      type="text"
                      placeholder={`Option ${letter} text`}
                      value={opt}
                      onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                      className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-800 focus:outline-hidden"
                    />
                    {isCorrect && (
                      <span className="text-[11px] font-semibold text-emerald-700 pr-2">
                        Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
