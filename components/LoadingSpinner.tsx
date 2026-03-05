import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2 h-5">
      <div className="w-1 flex-shrink-0 h-2/3 bg-current rounded-full animate-wave" style={{ animationDelay: '-0.3s' }} />
      <div className="w-1 flex-shrink-0 h-full bg-current rounded-full animate-wave" style={{ animationDelay: '-0.15s' }} />
      <div className="w-1 flex-shrink-0 h-2/3 bg-current rounded-full animate-wave" />
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
        .animate-wave {
          animation: wave 1s infinite ease-in-out;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
