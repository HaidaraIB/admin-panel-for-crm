
import React from 'react';
import Skeleton from './Skeleton';

/** Loading placeholder shaped like PlanAdminCard. */
const PlanCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <Skeleton className="mb-2 h-6 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-5 w-1/2 rounded-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-700/60">
        <Skeleton className="h-6 w-36 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default PlanCardSkeleton;
