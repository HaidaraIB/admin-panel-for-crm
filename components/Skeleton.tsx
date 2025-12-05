
import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse ${className}`}
    ></div>
  );
};

export default Skeleton;
