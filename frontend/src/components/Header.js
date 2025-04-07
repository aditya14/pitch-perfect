import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { 
  Trophy, ChevronRight, Moon, Sun, Home, LogOut, User, 
  ShieldHalf,
  Shield
} from 'lucide-react';

const Header = ({ theme, onThemeChange }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [leagueInfo, setLeagueInfo] = useState(null);
  
  // Extract leagueId from URL path pattern
  const getLeagueIdFromPath = () => {
    const match = location.pathname.match(/\/leagues\/([^\/]+)/);
    return match ? match[1] : null;
  };
  
  const leagueId = getLeagueIdFromPath();
  
  // Determine if we're in a league view
  const isLeagueView = location.pathname.includes('/leagues/') && leagueId;
  
  // Fetch league info when in league view
  useEffect(() => {
    if (isLeagueView && leagueId) {
      const fetchLeagueInfo = async () => {
        try {
          const response = await api.get(`/leagues/${leagueId}/`);
          setLeagueInfo(response.data);
        } catch (err) {
          console.error('Failed to fetch league info:', err);
        }
      };
      
      fetchLeagueInfo();
    } else {
      setLeagueInfo(null);
    }
  }, [isLeagueView, leagueId]);

  // Monitor screen width for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        <div class="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold text-primary-900 dark:text-white">Add to Home Screen</h3>
            <button class="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200" id="close-modal">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <p class="text-primary-700 dark:text-primary-300">To add PitchPerfect to your home screen:</p>
            <ol class="list-decimal pl-5 text-primary-700 dark:text-primary-300 space-y-2">
              <li>Tap the <strong>Share</strong> icon at the bottom of your screen</li>
              <li>Select <strong>"Add to Home Screen"</strong> from the menu</li>
              <li>Tap <strong>"Add"</strong> to confirm</li>
            </ol>
          </div>
          <div class="mt-6">
            <button class="w-full py-2 px-4 bg-neutral-500 hover:bg-neutral-700 text-white font-semibold rounded-lg shadow-md focus:outline-none" id="confirm-modal">
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
  
  // If we're in a league view, determine the active tab
  const getActiveTab = () => {
    if (!isLeagueView) return null;
    
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Check if the last segment is one of our tabs
    const tabIds = ['dashboard', 'matches', 'squads', 'table', 'stats', 'trades'];
    if (tabIds.includes(lastSegment)) {
      return lastSegment;
    }
    
    // Default to dashboard if not found
    return 'dashboard';
  };
  
  const activeTab = getActiveTab();

  // League navigation tabs
  const leagueTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'matches', label: 'Matches' },
    { id: 'squads', label: 'Squads' },
    { id: 'table', label: 'Standings' },
    { id: 'stats', label: 'Stats' },
    { id: 'trades', label: 'Trades' },
  ];
  
  // Handle tab change
  const handleTabChange = (tabId) => {
    if (!leagueId) return;
    navigate(`/leagues/${leagueId}/${tabId}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full theme-transition bg-white dark:bg-neutral-950 shadow-sm fix-fixed">
      {/* Safe area padding to account for notch/status bar */}
      <div className="w-full bg-white dark:bg-neutral-900 safe-area-top"></div>
      
      <div className="container mx-auto px-2 sm:px-6 lg:px-3">
        {/* Main Header Row */}
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and League Name */}
          <div className="flex items-center">
            <Link 
              to="/dashboard"
              className="flex items-center"
            >
              <img src="/icon.png" alt="Logo" className="h-9 w-9" />
              <div 
                className="ml-3 text-xl font-extrabold text-primary-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-300 hidden sm:block"
              >
                <span className="text-primary-500 dark:text-primary-500">Pitch</span>Perfect
              </div>
            </Link>
            
            {/* League name */}
            {isLeagueView && leagueInfo && (
              <div className="ml-3 sm:ml-6 sm:pl-4 sm:border-l sm:border-primary-200 sm:dark:border-primary-700">
                <div className="text-primary-900 dark:text-white font-medium">
                  {leagueInfo.name}
                </div>
                {leagueInfo.season && (
                  <div className="text-xs text-primary-500 dark:text-primary-400">
                    {leagueInfo.season.name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side - My Squad button and User Menu */}
          <div className="flex items-center">
            {/* My Squad button (for league views) */}
            {isLeagueView && leagueInfo && (
              <Link 
                to={leagueInfo.my_squad ? `/squads/${leagueInfo.my_squad.id}` : '#'}
                className={`mr-3 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
                  ${leagueInfo.my_squad 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                onClick={e => (!leagueInfo.my_squad) && e.preventDefault()}
              >
                <Shield className="h-4 w-4" />
                <span>My Squad</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}

            {/* User menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-1"
              >
                <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center shadow-sm">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
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
                <div className="absolute right-0 mt-2 w-48 py-1 theme-transition bg-white dark:bg-neutral-900 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  <Link
                    to="/profile"
                    className="px-4 py-2 text-sm text-primary-700 dark:text-primary-300 flex items-center w-full hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 text-sm text-primary-700 dark:text-primary-300 flex items-center w-full hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="h-4 w-4 mr-2" />
                        Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 mr-2" />
                        Light Mode
                      </>
                    )}
                  </button>
                  
                  {/* Show "Add to Home Screen" button only if on mobile and not already in standalone mode */}
                  {isMobile && !isStandalone && (
                    <button
                      onClick={handleAddToHomeScreen}
                      className="px-4 py-2 text-sm text-primary-700 dark:text-primary-300 flex items-center w-full hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Add to Home Screen
                    </button>
                  )}
                  
                  <div className="border-t border-primary-100 dark:border-primary-700"></div>
                  
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm text-primary-700 dark:text-primary-300 flex items-center w-full hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* League Navigation Tabs (consistent across all devices) */}
      {isLeagueView && (
        <div className="border-t border-primary-100 dark:border-primary-800 overflow-x-auto">
          <div className="container mx-auto px-4">
            <nav className="flex">
              {leagueTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    whitespace-nowrap py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm
                    ${activeTab === tab.id
                      ? 'text-primary-600 border-b-2 border-primary-500 dark:text-primary-400 dark:border-primary-400'
                      : 'text-primary-700 hover:text-primary-900 dark:text-primary-300 dark:hover:text-white border-b-2 border-transparent'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;