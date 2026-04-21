
import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={`rounded-md bg-gradient-to-r from-gray-200 via-primary-100/60 to-gray-200 dark:from-gray-700 dark:via-primary-900/30 dark:to-gray-700 animate-pulse ${className}`}
    ></div>
  );
};

export default Skeleton;
