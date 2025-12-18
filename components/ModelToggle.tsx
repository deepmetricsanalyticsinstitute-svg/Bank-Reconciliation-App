import React from 'react';

type ModelType = 'flash' | 'pro';

interface ModelToggleProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export const ModelToggle: React.FC<ModelToggleProps> = ({ selectedModel, onModelChange }) => {
  const baseClasses = "px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-slate-800";
  const activeClasses = "bg-indigo-600 text-white shadow";
  const inactiveClasses = "bg-transparent text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600";

  return (
    <div>
        <div className="text-center mb-2">
            <h4 className="text-md font-semibold text-gray-700 dark:text-slate-200 transition-colors duration-300">Processing Mode</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 transition-colors duration-300">'Accuracy' is better for complex files.</p>
        </div>
        <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-900/80 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors duration-300">
            <button
                onClick={() => onModelChange('flash')}
                className={`${baseClasses} ${selectedModel === 'flash' ? activeClasses : inactiveClasses}`}
                aria-pressed={selectedModel === 'flash'}
            >
                Speed
            </button>
            <button
                onClick={() => onModelChange('pro')}
                className={`${baseClasses} ${selectedModel === 'pro' ? activeClasses : inactiveClasses}`}
                aria-pressed={selectedModel === 'pro'}
            >
                Accuracy
            </button>
        </div>
    </div>
  );
};