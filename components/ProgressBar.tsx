import React from 'react';

interface ProgressBarProps {
  progress: number;
  message: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, message }) => {
  return (
    <div className="w-full max-w-xl mx-auto p-8 bg-white/80 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700 backdrop-blur-sm shadow-xl dark:shadow-2xl transition-colors duration-300">
      <div className="flex justify-between items-end mb-3">
        <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 animate-pulse">{message}</h3>
        <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 font-mono">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-900 rounded-full h-4 overflow-hidden border border-gray-300 dark:border-slate-700">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-500 mt-4 text-center italic transition-colors duration-300">
        Processing financial data securely. This may take up to a minute for large files.
      </p>
    </div>
  );
};