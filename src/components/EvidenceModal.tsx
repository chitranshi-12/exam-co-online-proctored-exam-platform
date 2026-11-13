import React from 'react';
import { Violation } from '../types';
import { ViolationBadge } from './ViolationBadge';
import { X, Calendar, Monitor, Camera, Download, AlertTriangle } from 'lucide-react';

interface EvidenceModalProps {
  violation: Violation | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ violation, onClose }) => {
  if (!violation) return null;

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col z-10 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <ViolationBadge type={violation.type} size="md" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {violation.studentName || 'Student'}
                <span className="text-slate-500 font-normal ml-2">({violation.rollNo || 'N/A'})</span>
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Captured: {new Date(violation.occurredAt).toLocaleString()}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {violation.details && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Event Diagnosis: </span>
                <span>{violation.details}</span>
              </div>
            </div>
          )}

          {/* Evidence Grid: Screen + Webcam */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Screen snapshot */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-indigo-600" />
                  <span>Screen Capture</span>
                </span>
                {violation.screenshotUrl && (
                  <button
                    onClick={() => downloadImage(violation.screenshotUrl!, `screen_${violation.id}.jpg`)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                )}
              </div>
              <div className="bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-200 relative group flex items-center justify-center">
                {violation.screenshotUrl ? (
                  <img
                    src={violation.screenshotUrl}
                    alt="Screen Evidence"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 text-xs">No screen capture available</span>
                )}
              </div>
            </div>

            {/* Webcam snapshot */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-teal-600" />
                  <span>Proctor Webcam Snapshot</span>
                </span>
                {violation.webcamUrl && (
                  <button
                    onClick={() => downloadImage(violation.webcamUrl!, `webcam_${violation.id}.jpg`)}
                    className="text-[11px] text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                )}
              </div>
              <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video border border-slate-200 relative group flex items-center justify-center">
                {violation.webcamUrl ? (
                  <img
                    src={violation.webcamUrl}
                    alt="Webcam Evidence"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 text-xs">No webcam capture available</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-lg transition-colors"
          >
            Close Evidence Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
