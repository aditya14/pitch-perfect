import { useEffect } from 'react';

/**
 * A custom hook to update the document title dynamically
 * 
 * @param {string} title - The title to set (without the app name prefix)
 * @param {boolean} withPrefix - Whether to add the app name prefix (defaults to true)
 * @returns {void}
 * 
 * Usage examples:
 * useDocumentTitle('Dashboard'); // Sets "Pitch Perfect | Dashboard"
 * useDocumentTitle('My Cool League - Dashboard'); // Sets "Pitch Perfect | My Cool League - Dashboard"
 * useDocumentTitle('Full Title', false); // Sets just "Full Title" without the prefix
 */
const useDocumentTitle = (title, withPrefix = true) => {
  useEffect(() => {
    const appName = 'Pitch Perfect';
    document.title = withPrefix ? `${appName} | ${title}` : title;
    
    // Cleanup function to reset the title when component unmounts
    return () => {
      document.title = appName;
    };
  }, [title, withPrefix]);
};

export default useDocumentTitle;
