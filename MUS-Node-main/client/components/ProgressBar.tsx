import React from 'react';

interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  // Ensure progress is within 0-100 range for styling
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex items-center w-full max-w-lg mx-auto">
      <div className="w-full bg-slate-200 rounded-full h-3">
        <div
          className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-linear"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
      <span className="ml-4 text-md font-semibold text-slate-600 w-12 text-left tabular-nums">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  );
};
