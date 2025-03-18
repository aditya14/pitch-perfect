import React, { useEffect } from 'react';

const LoadingScreen = ({ message = "Loading...", description = "Preparing your cricketing experience"}) => {
  // Ensure dark mode is properly applied to the loading screen
  useEffect(() => {
    // Check for dark mode preference in localStorage 
    const storedTheme = localStorage.getItem('theme');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Ensure dark mode is applied if needed
    if (storedTheme === 'dark' || (!storedTheme && prefersDarkMode)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-50">
      <div className="w-24 h-24 mb-4 relative">
        {/* Outer spinning cricket ball */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-500 animate-spin"></div>
        
        {/* Inner spinning cricket ball with seam */}
        <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-indigo-500 dark:border-t-indigo-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        
        {/* Cricket ball core */}
        <div className="absolute inset-6 bg-indigo-600 dark:bg-indigo-500 rounded-full">
          {/* Cricket seam line */}
          <div className="absolute w-full h-0.5 bg-white dark:bg-gray-200 top-1/2 -translate-y-1/2 transform rotate-45"></div>
          <div className="absolute w-full h-0.5 bg-white dark:bg-gray-200 top-1/2 -translate-y-1/2 transform -rotate-45"></div>
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">{message}</h2>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
        <p>{description}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;