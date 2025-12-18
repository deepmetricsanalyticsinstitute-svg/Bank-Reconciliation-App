
import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from './icons';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        // If a theme is saved, respect it.
        if (saved) return saved === 'dark';
        // Otherwise, default to dark as requested.
        return true;
    }
    return true; // Default to dark during SSR or initial mount
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-full transition-colors duration-200 bg-white border border-gray-200 shadow-sm text-gray-500 hover:bg-gray-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Toggle Dark Mode"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};
