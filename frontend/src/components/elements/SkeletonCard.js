import React from 'react';

const SkeletonCard = ({ variant = 'default' }) => {
  if (variant === 'match') {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-4 animate-pulse">
        <div className="flex justify-between items-center mb-3">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24"></div>
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
          </div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-12"></div>
          <div className="flex items-center space-x-3">
            <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
        </div>
        
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-32 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-32"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4"></div>
      </div>
      
      <div className="space-y-3">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24"></div>
        <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
