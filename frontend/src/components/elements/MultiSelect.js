// MultiSelect.js
import React, { useState, useEffect, useRef } from 'react';

const MultiSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    const newValue = value.includes(option) 
      ? value.filter(v => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  return (
    <div ref={containerRef} className="relative w-60">
      <div 
        className="w-full min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer
                   bg-white dark:bg-neutral-700 
                   border-neutral-300 dark:border-neutral-600
                   hover:border-neutral-400 dark:hover:border-neutral-500
                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value.length === 0 ? (
          <span className="text-neutral-500 dark:text-neutral-400">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {value.map(v => (
              <span 
                key={v} 
                className="inline-flex items-center px-2 py-1 rounded
                           bg-neutral-200 dark:bg-neutral-600 
                           text-sm text-neutral-800 dark:text-neutral-200"
              >
                {v}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(v);
                  }}
                  className="ml-1 hover:text-red-500 focus:outline-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <svg 
            className="w-5 h-5 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-700 
                        border border-neutral-300 dark:border-neutral-600 rounded-lg 
                        shadow-lg max-h-60 overflow-auto">
          {options.map(option => (
            <div
              key={option}
              className={`flex items-center px-3 py-2 cursor-pointer
                         ${value.includes(option) 
                           ? 'bg-neutral-100 dark:bg-neutral-600' 
                           : 'hover:bg-neutral-50 dark:hover:bg-neutral-600'}`}
              onClick={() => toggleOption(option)}
            >
              <div className={`w-4 h-4 border rounded mr-2
                             ${value.includes(option)
                               ? 'border-indigo-500 bg-indigo-500'
                               : 'border-neutral-300 dark:border-neutral-500'}`}>
                {value.includes(option) && (
                  <svg 
                    className="w-4 h-4 text-white" 
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span className="text-neutral-900 dark:text-neutral-200">{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;