import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  themeColor?: 'indigo' | 'white';
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  themeColor = 'indigo',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const isWhite = themeColor === 'white';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Inline SVG Logo */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`${iconSizes[size]} shrink-0 transition-transform hover:scale-105 duration-200`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bookGradSvg" x1="8" y1="18" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
          <linearGradient id="checkGradSvg" x1="20" y1="16" x2="42" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FACC15" />
          </linearGradient>
          <filter id="shadowGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#4F46E5" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Open Book with spine */}
        <path
          d="M32 28 C25 22, 14 22, 8 25 L8 50 C14 47, 25 47, 32 53 C39 47, 50 47, 56 50 L56 25 C50 22, 39 22, 32 28 Z"
          fill="url(#bookGradSvg)"
          filter="url(#shadowGlow)"
        />
        {/* Book spine divider */}
        <path d="M32 28 L32 53" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />

        {/* Page curves accents */}
        <path d="M12 45 C18 43, 26 43, 30 47" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
        <path d="M52 45 C46 43, 38 43, 34 47" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.35" />

        {/* Rounded Checkmark above spine */}
        <path
          d="M23 23 L29 29 L41 15"
          stroke="url(#checkGradSvg)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Graduation Cap at top-right */}
        <path d="M46 11 L55 7 L59 12 L50 16 Z" fill="#F97316" />
        <path d="M49 15.5 L49 20 C49 21.5 53 21.5 53 20 L53 13.8" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="56" cy="14" r="1.2" fill="#FACC15" />
      </svg>

      {/* Wordmark */}
      {variant === 'full' && (
        <span
          className={`font-['Poppins'] font-bold tracking-tight leading-none ${textSizes[size]} ${
            isWhite ? 'text-white' : 'text-slate-900'
          }`}
        >
          <span className={isWhite ? 'text-white' : 'text-indigo-600'}>Exam</span>
          <span className="text-orange-500">.co</span>
        </span>
      )}
    </div>
  );
};
