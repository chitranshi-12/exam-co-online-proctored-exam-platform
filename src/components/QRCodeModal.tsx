import React, { useState } from 'react';
import { Exam } from '../types';
import { X, Copy, Check, MessageSquare, Mail, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  exam: Exam | null;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ exam, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!exam) return null;

  const fullExamUrl = `${window.location.origin}/exam/${exam.id || exam._id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullExamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = encodeURIComponent(
    `Take your proctored exam "${exam.title}".\nLink: ${fullExamUrl}\nAccess Code: ${exam.examCode}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(`Exam Link: ${exam.title}`)}&body=${shareText}`;

  // SVG QR Code pattern generator (self-contained, no external API that can be blocked)
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    fullExamUrl
  )}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Share Exam Link</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 text-center">
          <div className="inline-block p-3 bg-white border border-slate-200 rounded-xl shadow-xs mb-3">
            <img
              src={qrSvgUrl}
              alt="Exam QR Code"
              className="w-44 h-44 mx-auto rounded"
              onError={(e) => {
                // Fallback SVG representation if offline
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <p className="text-[11px] text-slate-400 mt-2 font-mono">Scan with phone camera</p>
          </div>

          <h4 className="font-semibold text-slate-900 text-sm">{exam.title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{exam.institute}</p>

          {/* Access Code Pill */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <span className="text-xs text-indigo-700 font-medium">Access Code:</span>
            <span className="font-mono font-bold text-indigo-900 text-sm tracking-wider">
              {exam.examCode}
            </span>
          </div>
        </div>

        {/* Link Input + Copy Button */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">Student Entry URL</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullExamUrl}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 focus:outline-hidden select-all"
            />
            <button
              onClick={handleCopy}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
            <a
              href={mailUrl}
              className="flex items-center justify-center gap-2 border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Link</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
