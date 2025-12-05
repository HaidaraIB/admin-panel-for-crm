
import React from 'react';
import Skeleton from './Skeleton';

const PlanCardSkeleton: React.FC = () => {
  return (
    <div className="bg-primary-50 dark:bg-gray-800 rounded-lg shadow-md p-6 border-t-4 border-gray-300 dark:border-gray-600 flex flex-col">
      <Skeleton className="w-3/5 h-8 mb-6" />
      <Skeleton className="w-1/2 h-10 mb-6" />
      <div className="space-y-3 flex-grow mb-6">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-2/3 h-4" />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center">
            <Skeleton className="w-24 h-6 rounded-md" />
            <div className="flex items-center space-x-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlanCardSkeleton;
