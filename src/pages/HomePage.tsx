import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import {
  Link2,
  Eye,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Camera,
  Monitor,
  FileSpreadsheet,
  Clock,
  CheckCircle,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { teacher, loginDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleTryDemo = () => {
    loginDemoUser();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo variant="full" size="md" />

          <div className="flex items-center gap-3">
            {teacher ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <button
                  onClick={handleTryDemo}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Try Demo
                </button>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Sign in with Google
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Soft background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-300 rounded-full blur-3xl" />
          <div className="absolute top-16 right-1/4 w-80 h-80 bg-teal-200 rounded-full blur-3xl" />
          <div className="absolute top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Tagline kicker */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-indigo-100 rounded-full shadow-xs mb-6 text-xs font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Next-Gen Academic Integrity & Remote Proctoring</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            Send a link.{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-teal-600 to-indigo-700 bg-clip-text text-transparent">
              See every exam.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            The effortless proctoring platform for educators. Create an exam in seconds, 
            distribute a link, and watch student screens and webcams live with silent, 
            uninterrupted violation evidence.
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4 bg-white rounded-full p-0.5"
              />
              <span>Sign in with Google</span>
            </Link>

            <button
              onClick={handleTryDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm rounded-xl border border-slate-300/80 shadow-xs transition-all hover:border-slate-400"
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Try Instant Demo (No Setup)</span>
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> No student install needed
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Zero student warnings
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Real-time evidence timeline
            </span>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Designed for Teachers. Built for True Compliance.
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Everything educators need to maintain academic standards without complex software or intrusive desktop agents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-xs">
                <Link2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">1. One-Click Exam Links</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate an instant URL and QR code. Students enter their details, grant screen and camera permissions, and begin.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-teal-50/50 border border-teal-100 hover:border-teal-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-4 shadow-xs">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">2. Live Multi-Screen Grid</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Watch all active test-takers simultaneously with real-time status, progress indicators, and instant click-to-view video.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-orange-50/50 border border-orange-100 hover:border-orange-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-4 shadow-xs">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">3. Silent AI Detection</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tab switches, window blurs, devtools, copy/paste, and absence from webcam are captured silently. Students receive zero alerts.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-rose-50/50 border border-rose-100 hover:border-rose-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center mb-4 shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">4. Verified Evidence Trail</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every detected incident logs high-resolution screen and webcam frames with timestamped watermarks for indisputable audit reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo variant="full" size="sm" />
            <span className="text-xs text-slate-500 ml-2">
              · Send a link. See every exam.
            </span>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Exam.co. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
