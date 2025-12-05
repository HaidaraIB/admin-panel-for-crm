
import React from 'react';
import Skeleton from './Skeleton';

const GatewayCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="w-16 h-10" />
          <Skeleton className="w-11 h-6 rounded-full" />
        </div>
        <Skeleton className="w-1/2 h-6 mb-2" />
        <Skeleton className="w-full h-4 mb-1" />
        <Skeleton className="w-3/4 h-4" />
      </div>
      <div className="mt-6 flex justify-between items-center">
        <Skeleton className="w-24 h-6 rounded-full" />
        <Skeleton className="w-28 h-9 rounded-md" />
      </div>
    </div>
  );
};

export default GatewayCardSkeleton;
