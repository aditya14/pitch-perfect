import React, { useEffect } from 'react';

const LoadingScreen = ({ message = "Loading...", description = "Preparing your cricketing experience"}) => {
  useEffect(() => {
    // Only apply theme if not already set
    const storedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const html = document.documentElement;
    if (storedTheme === 'dark' && !html.classList.contains('dark')) {
      html.classList.add('dark');
      html.style.backgroundColor = '#0a0a0a';
    } else if (storedTheme === 'light' && html.classList.contains('dark')) {
      html.classList.remove('dark');
      html.style.backgroundColor = '#ffffff';
    } else if (!storedTheme) {
      // Only apply system preference if no explicit theme
      if (prefersDarkMode && !html.classList.contains('dark')) {
        html.classList.add('dark');
        html.style.backgroundColor = '#0a0a0a';
      } else if (!prefersDarkMode && html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.style.backgroundColor = '#ffffff';
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-neutral-900 z-50">
      <div className="w-24 h-24 mb-4 relative">
        {/* Outer spinning cricket ball */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 dark:border-t-primary-500 animate-spin"></div>
        
        {/* Inner spinning cricket ball with seam */}
        <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-primary-500 dark:border-t-primary-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        
        {/* Cricket ball core */}
        <div className="absolute inset-6 bg-primary-600 dark:bg-primary-500 rounded-full">
          {/* Cricket seam line */}
          <div className="absolute w-full h-0.5 bg-white dark:bg-neutral-200 top-1/2 -translate-y-1/2 transform rotate-45"></div>
          <div className="absolute w-full h-0.5 bg-white dark:bg-neutral-200 top-1/2 -translate-y-1/2 transform -rotate-45"></div>
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-neutral-800 dark:text-white">{message}</h2>
      
      <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-xs">
        <p>{description}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;