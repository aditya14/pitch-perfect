import { useEffect } from 'react';

/**
 * A custom hook to update the document title dynamically
 * 
 * @param {string} title - The title to set (without the app name suffix)
 * @param {boolean} withSuffix - Whether to add the app name suffix (defaults to true)
 * @returns {void}
 * 
 * Usage examples:
 * useDocumentTitle('Dashboard'); // Sets "Dashboard | Squadly"
 * useDocumentTitle('My Cool League - Dashboard'); // Sets "My Cool League - Dashboard | Squadly"
 * useDocumentTitle('Full Title', false); // Sets just "Full Title" without the suffix
 */
const useDocumentTitle = (title, withSuffix = true) => {
  useEffect(() => {
    const appName = 'Squadly';
    document.title = withSuffix ? `${title} | ${appName}` : title;
    
    // Cleanup function to reset the title when component unmounts
    return () => {
      document.title = appName;
    };
  }, [title, withSuffix]);
};

export default useDocumentTitle;
