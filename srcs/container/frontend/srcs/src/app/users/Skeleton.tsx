import React from 'react';

export default function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-300 dark:bg-gray-700 rounded-md ${className}`} />
  );
}
