import React from 'react';
import { ViolationType } from '../types';
import {
  ExternalLink,
  EyeOff,
  WifiOff,
  Maximize2,
  VideoOff,
  Copy,
  Terminal,
  Users,
  UserX,
  AlertTriangle,
  Wifi,
  Mic,
  Volume2,
} from 'lucide-react';

interface ViolationBadgeProps {
  type: ViolationType;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const ViolationBadge: React.FC<ViolationBadgeProps> = ({
  type,
  showIcon = true,
  className = '',
  size = 'md',
}) => {
  const configMap: Record<
    ViolationType,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    tab_switch: {
      label: 'Tab Switch',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <ExternalLink className="w-3.5 h-3.5" />,
    },
    window_blur: {
      label: 'Window Blur',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: <EyeOff className="w-3.5 h-3.5" />,
    },
    offline: {
      label: 'Offline',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: <WifiOff className="w-3.5 h-3.5" />,
    },
    online_restored: {
      label: 'Online Restored',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <Wifi className="w-3.5 h-3.5" />,
    },
    fullscreen_exit: {
      label: 'Fullscreen Exit',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: <Maximize2 className="w-3.5 h-3.5" />,
    },
    screen_share_stopped: {
      label: 'Screen Share Stopped',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <VideoOff className="w-3.5 h-3.5" />,
    },
    copy: {
      label: 'Copy Attempt',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Copy className="w-3.5 h-3.5" />,
    },
    paste: {
      label: 'Paste Attempt',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Copy className="w-3.5 h-3.5" />,
    },
    cut: {
      label: 'Cut Attempt',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Copy className="w-3.5 h-3.5" />,
    },
    right_click: {
      label: 'Right Click',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    print_screen: {
      label: 'PrintScreen',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    devtools: {
      label: 'DevTools',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <Terminal className="w-3.5 h-3.5" />,
    },
    no_face: {
      label: 'No Face',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <UserX className="w-3.5 h-3.5" />,
    },
    multiple_faces: {
      label: 'Multiple Faces',
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      border: 'border-pink-200',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    audio_noise: {
      label: 'Voice / Audio Detected',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-200',
      icon: <Mic className="w-3.5 h-3.5" />,
    },
    multiple_voices: {
      label: 'Multiple Voices',
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      icon: <Volume2 className="w-3.5 h-3.5" />,
    },
  };

  const badge = configMap[type] || {
    label: type,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${badge.bg} ${badge.text} ${badge.border} ${sizeClasses} ${className}`}
    >
      {showIcon && badge.icon}
      <span>{badge.label}</span>
    </span>
  );
};
