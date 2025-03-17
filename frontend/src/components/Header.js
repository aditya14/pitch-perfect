import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = ({ theme, onThemeChange }) => {
  const { logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Detect platform and standalone mode
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/i.test(userAgent);
    const isIOSDevice = /iphone|ipad|ipod/i.test(userAgent);
    
    // Check if this is a mobile device
    const isMobileDevice = isAndroidDevice || isIOSDevice || 
                           /mobile|tablet|opera mini|blackberry/i.test(userAgent);
    
    setIsAndroid(isAndroidDevice);
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);
    
    // Check if app is already installed/running in standalone mode
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone || 
                               document.referrer.includes('android-app://');
    
    setIsStandalone(isRunningStandalone);
    
    // Listen for the beforeinstallprompt event (for Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
    });
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    onThemeChange(newTheme);
    setIsDropdownOpen(false);
  };
  
  // Handler for Add to Home Screen button
  const handleAddToHomeScreen = () => {
    if (deferredPrompt) {
      // For Android: Show the installation prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        // Clear the saved prompt since it can't be used again
        setDeferredPrompt(null);
      });
    } else if (isIOS) {
      // For iOS: Show instructions modal since direct install isn't possible
      showIOSInstallInstructions();
    }
    
    setIsDropdownOpen(false);
  };
  
  // Helper function to show iOS installation instructions
  const showIOSInstallInstructions = () => {
    // Create simplified instructions for iOS
    const instructionsHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" id="ios-install-modal">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Add to Home Screen</h3>
            <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" id="close-modal">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <p class="text-gray-700 dark:text-gray-300">To add PitchPerfect to your home screen:</p>
            <ol class="list-decimal pl-5 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Tap the <strong>Share</strong> icon at the bottom of your screen</li>
              <li>Select <strong>"Add to Home Screen"</strong> from the menu</li>
              <li>Tap <strong>"Add"</strong> to confirm</li>
            </ol>
          </div>
          <div class="mt-6">
            <button class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md focus:outline-none" id="confirm-modal">
              Got it
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Create a container for the modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = instructionsHTML;
    document.body.appendChild(modalContainer);
    
    // Add event listeners for the close buttons
    const closeModal = () => {
      document.body.removeChild(modalContainer);
    };
    
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('confirm-modal').addEventListener('click', closeModal);
    document.getElementById('ios-install-modal').addEventListener('click', (e) => {
      if (e.target.id === 'ios-install-modal') {
        closeModal();
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b theme-transition bg-white dark:bg-gray-800 shadow-sm fix-fixed">
      {/* Safe area padding to account for notch/status bar */}
      <div className="w-full bg-white dark:bg-gray-800 safe-area-top"></div>
      
      <div className="container mx-auto px-2 sm:px-6 lg:px-3">
        <div className="flex justify-between h-16">
          {/* Left side - Logo with updated styling */}
          <Link 
              to="/dashboard"
              className="flex items-center"
          >
            <img src="/icon.png" alt="Logo" className="h-9 w-9 mr-3 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300" />
            <div 
              className="text-xl font-extrabold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300"
            >
              <span className="text-indigo-600 dark:text-indigo-400">Pitch</span>Perfect
            </div>
          </Link>

          {/* Right side - User Menu */}
          <div className="flex items-center">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shadow-sm">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-indigo-600 dark:text-indigo-400" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="ml-1 h-5 w-5" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 py-1 theme-transition bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  <button
                    disabled
                    className="cursor-not-allowed px-4 py-2 text-sm text-gray-400 dark:text-gray-500 flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 mr-2" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    Profile
                  </button>
                  
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {theme === 'light' ? (
                      <>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 mr-2" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                        Dark Mode
                      </>
                    ) : (
                      <>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4 mr-2" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                        Light Mode
                      </>
                    )}
                  </button>
                  
                  {/* Show "Add to Home Screen" button only if on mobile and not already in standalone mode */}
                  {isMobile && !isStandalone && (
                    <button
                      onClick={handleAddToHomeScreen}
                      className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 mr-2" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      Add to Home Screen
                    </button>
                  )}
                  
                  <div className="border-t border-gray-100 dark:border-gray-700"></div>
                  
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 mr-2" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;