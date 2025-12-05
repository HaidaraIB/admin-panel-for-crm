import React from 'react';

const FullPageLoader: React.FC = () => {
    return (
        <div className="absolute inset-0 bg-gray-50/75 dark:bg-gray-900/75 z-50 flex items-center justify-center">
            <div className="flex items-center justify-center space-x-2 h-12 text-primary-500">
                <div className="w-2 h-1/2 bg-current rounded-full animate-wave" style={{ animationDelay: '-0.4s' }}></div>
                <div className="w-2 h-full bg-current rounded-full animate-wave" style={{ animationDelay: '-0.2s' }}></div>
                <div className="w-2 h-1/2 bg-current rounded-full animate-wave" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-full bg-current rounded-full animate-wave" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-1/2 bg-current rounded-full animate-wave" style={{ animationDelay: '0.4s' }}></div>
            </div>
             <style>{`
                @keyframes wave {
                  0%, 100% { transform: scaleY(0.5); }
                  50% { transform: scaleY(1); }
                }
                .animate-wave {
                  animation: wave 1.2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default FullPageLoader;
