/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { DemoBanner } from './components/DemoBanner';
import { NotificationDrawer } from './components/NotificationDrawer';
import { EvidenceModal } from './components/EvidenceModal';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyExamsPage } from './pages/MyExamsPage';
import { CreateExamPage } from './pages/CreateExamPage';
import { LiveMonitorPage } from './pages/LiveMonitorPage';
import { ResultsPage } from './pages/ResultsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { StudentEntryPage } from './pages/StudentEntryPage';
import { StudentExamPage } from './pages/StudentExamPage';
import { StudentSubmittedPage } from './pages/StudentSubmittedPage';

import { api } from './services/api';
import { demoSync } from './demo/demoSync';
import { ExamNotification, Violation } from './types';

// Protected Route wrapper for Teacher pages
const ProtectedTeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teacher, loading, isDemo, loginDemoUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center text-xs text-slate-500">
        Loading teacher session...
      </div>
    );
  }

  if (!teacher && !isDemo) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If in demo mode and no teacher is set, auto-login demo teacher
  if (isDemo && !teacher) {
    loginDemoUser();
  }

  return <>{children}</>;
};

// Main Layout component
const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { teacher, isDemo } = useAuth();

  const isStudentRoute = location.pathname.startsWith('/exam');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<ExamNotification[]>([]);
  const [selectedViolationForEvidence, setSelectedViolationForEvidence] = useState<Violation | null>(null);

  const fetchNotifications = async () => {
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!isStudentRoute) {
      fetchNotifications();
      if (isDemo) {
        const unsub = demoSync.subscribe((msg) => {
          if (msg.type === 'VIOLATION_REPORTED' || msg.type === 'NOTIFICATION_READ_ALL') {
            fetchNotifications();
          }
        });
        return unsub;
      }
    }
  }, [isStudentRoute, isDemo]);

  const handleMarkAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    fetchNotifications();
  };

  const handleSelectNotification = (notif: ExamNotification) => {
    setDrawerOpen(false);
    if (notif.attemptId) {
      navigate(`/student/${notif.attemptId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-slate-800 flex flex-col font-sans">
      {/* Demo Banner shown across all pages when in demo mode */}
      <DemoBanner />

      {/* Teacher Top Navigation (Hidden during student exam session) */}
      {!isStudentRoute && (
        <Header
          onOpenNotifications={() => setDrawerOpen(true)}
          unreadCount={unreadCount}
        />
      )}

      {/* Notification Slide-Over Drawer */}
      <NotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectNotification={handleSelectNotification}
      />

      {/* Main Page View */}
      <div className={!isStudentRoute && location.pathname !== '/' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full flex-1' : 'flex-1'}>
        <Routes>
          {/* Public Home & Auth */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Teacher Console Routes (Protected) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedTeacherRoute>
                <DashboardPage />
              </ProtectedTeacherRoute>
            }
          />
          <Route
            path="/exams"
            element={
              <ProtectedTeacherRoute>
                <MyExamsPage />
              </ProtectedTeacherRoute>
            }
          />
          <Route
            path="/exams/new"
            element={
              <ProtectedTeacherRoute>
                <CreateExamPage />
              </ProtectedTeacherRoute>
            }
          />
          <Route
            path="/monitor"
            element={
              <ProtectedTeacherRoute>
                <LiveMonitorPage />
              </ProtectedTeacherRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedTeacherRoute>
                <ResultsPage />
              </ProtectedTeacherRoute>
            }
          />
          <Route
            path="/student/:id"
            element={
              <ProtectedTeacherRoute>
                <StudentDetailPage />
              </ProtectedTeacherRoute>
            }
          />

          {/* Student Flow Routes */}
          <Route path="/exam/:examId" element={<StudentEntryPage />} />
          <Route path="/exam/:examId/take" element={<StudentExamPage />} />
          <Route path="/exam/:examId/submitted" element={<StudentSubmittedPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <EvidenceModal
        violation={selectedViolationForEvidence}
        onClose={() => setSelectedViolationForEvidence(null)}
      />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
