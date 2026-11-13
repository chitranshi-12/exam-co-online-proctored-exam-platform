import React from 'react';
import { ExamNotification } from '../types';
import { ViolationBadge } from './ViolationBadge';
import { X, CheckCheck, Clock, ShieldAlert } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ExamNotification[];
  onMarkAllRead: () => void;
  onSelectNotification?: (notif: ExamNotification) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-base">Violation Alerts</h2>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 px-2 py-1 hover:bg-indigo-50 rounded"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShieldAlert className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No violations detected</p>
              <p className="text-xs text-slate-400 mt-1">All candidates are in compliance</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onSelectNotification?.(notif)}
                className={`py-3.5 px-3 rounded-lg transition-colors cursor-pointer ${
                  !notif.read ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-xs text-slate-900">
                    {notif.studentName || 'Student'} · {notif.rollNo || 'N/A'}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTime(notif.createdAt)}
                  </span>
                </div>

                {notif.violationType && (
                  <div className="mb-2">
                    <ViolationBadge type={notif.violationType} size="sm" />
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
