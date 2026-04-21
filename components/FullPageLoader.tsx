import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const FullPageLoader: React.FC = () => {
    return (
        <div className="absolute inset-0 bg-gray-50/75 dark:bg-gray-900/75 z-50 flex items-center justify-center">
            <LoadingSpinner size="lg" label="Loading page" />
        </div>
    );
};

export default FullPageLoader;
