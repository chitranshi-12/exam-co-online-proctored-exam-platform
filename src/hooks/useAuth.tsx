import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeacherUser } from '../types';
import { api } from '../services/api';
import { loginWithGoogle, logoutTeacher, isFirebaseConfigured } from '../services/firebase';
import { DEMO_TEACHER } from '../demo/mockData';

interface AuthContextType {
  teacher: TeacherUser | null;
  loading: boolean;
  isDemo: boolean;
  isFirebaseReady: boolean;
  loginGoogle: (profile?: { email: string; displayName: string; photoURL?: string }) => Promise<void>;
  loginDemoUser: () => void;
  logout: () => Promise<void>;
  setDemoMode: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemo, setIsDemo] = useState<boolean>(api.getIsDemoMode());

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = api.getTeacherToken();
        if (token || isDemo) {
          const user = await api.getMe();
          setTeacher(user);
        }
      } catch (err) {
        console.warn('Initial auth check:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [isDemo]);

  const loginGoogle = async (profile?: { email: string; displayName: string; photoURL?: string }) => {
    setLoading(true);
    try {
      const fbResult = await loginWithGoogle(profile);
      const res = await api.signInWithGoogle(fbResult.idToken, {
        name: fbResult.displayName,
        email: fbResult.email,
        photo: fbResult.photoURL,
      });
      setTeacher(res.teacher);
    } finally {
      setLoading(false);
    }
  };

  const loginDemoUser = () => {
    api.setDemoMode(true);
    setIsDemo(true);
    api.setTeacherToken('demo_jwt_teacher_eleanor_vance');
    setTeacher(DEMO_TEACHER);
  };

  const logout = async () => {
    await logoutTeacher();
    api.setTeacherToken(null);
    setTeacher(null);
  };

  const setDemoMode = (enabled: boolean) => {
    api.setDemoMode(enabled);
    setIsDemo(enabled);
    if (enabled && !teacher) {
      setTeacher(DEMO_TEACHER);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        teacher,
        loading,
        isDemo,
        isFirebaseReady: isFirebaseConfigured,
        loginGoogle,
        loginDemoUser,
        logout,
        setDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
