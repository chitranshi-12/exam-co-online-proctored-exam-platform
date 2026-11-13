import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../hooks/useAuth';
import { Bell, LogOut, PlusCircle, MonitorPlay, BarChart3, BookOpen, Layers } from 'lucide-react';
import { api } from '../services/api';
import { demoSync } from '../demo/demoSync';

interface HeaderProps {
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications, unreadCount = 0 }) => {
  const { teacher, logout, isDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [internalUnread, setInternalUnread] = useState(unreadCount);

  useEffect(() => {
    setInternalUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    // Keep unread notification count synchronized in demo mode
    if (isDemo) {
      const updateUnread = () => {
        const notifs = demoSync.getNotifications();
        const unread = notifs.filter((n) => !n.read).length;
        setInternalUnread(unread);
      };
      updateUnread();
      const unsub = demoSync.subscribe((msg) => {
        if (msg.type === 'VIOLATION_REPORTED' || msg.type === 'NOTIFICATION_READ_ALL') {
          updateUnread();
        }
      });
      return unsub;
    }
  }, [isDemo]);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Layers },
    { name: 'My Exams', path: '/exams', icon: BookOpen },
    { name: 'Live Monitor', path: '/monitor', icon: MonitorPlay },
    { name: 'Results', path: '/results', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single Brand element */}
          <Link to="/" className="shrink-0 flex items-center">
            <Logo variant="full" size="md" />
          </Link>

          {/* Zone 2: Navigation Links (single-line, clean text with subtle active state) */}
          {teacher && (
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
              {navLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  (link.path === '/monitor' && location.pathname.startsWith('/monitor'));
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600 font-semibold'
                        : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Zone 3: Actions & Teacher Lockup */}
          <div className="flex items-center gap-3 shrink-0">
            {teacher ? (
              <>
                <Link
                  to="/exams/new"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Exam</span>
                </Link>

                {/* Notifications Bell */}
                <button
                  onClick={onOpenNotifications}
                  className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="View violations notifications"
                  title="Real-time Violation Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {internalUnread > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white animate-pulse">
                      {internalUnread > 99 ? '99+' : internalUnread}
                    </span>
                  )}
                </button>

                {/* Teacher Profile / Logout */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <img
                    src={teacher.photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher'}
                    alt={teacher.name}
                    className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 object-cover"
                  />
                  <div className="hidden lg:block text-left text-xs leading-tight">
                    <p className="font-semibold text-slate-900 truncate max-w-[120px]">{teacher.name}</p>
                    <p className="text-slate-500 truncate max-w-[120px]">{teacher.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors whitespace-nowrap"
                >
                  Sign In with Google
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
