import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { 
  Trophy, ChevronRight, Moon, Sun, Home, LogOut, User, 
  ShieldHalf, Shield, UsersRound, ChevronsUpDown, Check
} from 'lucide-react';
import MidSeasonDraftModal from './leagues/modals/MidSeasonDraftModal';
import UpdatePointsButton from './UpdatePointsButton';

// Flag to show/hide mid-season draft button
const SHOW_MID_SEASON_DRAFT = new Date() <= new Date(Date.UTC(2025, 3, 22, 13, 0, 0));

const Header = ({ theme, onThemeChange }) => {
  const { user, logout } = useAuth();
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
  const [squadInfo, setSquadInfo] = useState(null);
  const [userLeagues, setUserLeagues] = useState([]);
  const [isLeagueDropdownOpen, setIsLeagueDropdownOpen] = useState(false);
  const leagueDropdownRef = useRef(null);
  
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  // Extract leagueId from URL path pattern
  const getLeagueIdFromPath = () => {
    const match = location.pathname.match(/\/leagues\/([^\/]+)/);
    return match ? match[1] : null;
  };

  // Extract squadId from URL path pattern
  const getSquadIdFromPath = () => {
    const match = location.pathname.match(/\/squads\/([^\/]+)/);
    return match ? match[1] : null;
  };
  
  const leagueId = getLeagueIdFromPath();
  const squadId = getSquadIdFromPath();
  const isLeagueView = location.pathname.includes('/leagues/') && leagueId;
  const isSquadView = location.pathname.includes('/squads/') && squadId;
  
  // Fetch league info when in league view
  useEffect(() => {
    if (isLeagueView && leagueId) {
      const fetchLeagueInfo = async () => {
        try {
          const response = await api.get(`/leagues/${leagueId}/`);
          setLeagueInfo(response.data);
        } catch (err) {
          console.error('Failed to fetch league info:', err);
          setLeagueInfo(null); 
        }
      };
      
      fetchLeagueInfo();
    } else {
      setLeagueInfo(null);
    }
  }, [isLeagueView, leagueId]);

  // Fetch user's leagues
  useEffect(() => {
    const fetchUserLeagues = async () => {
      if (user) {
        try {
          const response = await api.get('/leagues/my_leagues/');
          setUserLeagues(response.data || []);
        } catch (err) {
          console.error('Failed to fetch user leagues:', err);
          setUserLeagues([]);
        }
      } else {
        setUserLeagues([]);
      }
    };
    fetchUserLeagues();
  }, [user]);

  // Fetch squad info when in squad view
  useEffect(() => {
    if (isSquadView && squadId) {
      const fetchSquadInfo = async () => {
        try {
          const response = await api.get(`/squads/${squadId}/`);
          setSquadInfo(response.data);
        } catch (err) {
          console.error('Failed to fetch squad info:', err);
        }
      };
      
      fetchSquadInfo();
    } else {
      setSquadInfo(null);
    }
  }, [isSquadView, squadId]);

  // Monitor screen width for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect platform and standalone mode
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/i.test(userAgent);
    const isIOSDevice = /iphone|ipad|ipod/i.test(userAgent);
    
    const isMobileDevice = isAndroidDevice || isIOSDevice || 
                           /mobile|tablet|opera mini|blackberry/i.test(userAgent);
    
    setIsAndroid(isAndroidDevice);
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);
    
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone || 
                               document.referrer.includes('android-app://');
    
    setIsStandalone(isRunningStandalone);
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    
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
      if (leagueDropdownRef.current && !leagueDropdownRef.current.contains(event.target)) {
        setIsLeagueDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure theme is always applied on navigation or theme change
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0a0a0a';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#ffffff';
    }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    onThemeChange(newTheme);
    setIsDropdownOpen(false);
  };

  const handleOpenDraftModal = () => {
    setIsDraftModalOpen(true);
  };
  
  const showIOSInstallInstructions = () => {
    // Implementation for iOS install instructions
  };
  
  // If we're in a league view, determine the active tab
  const getActiveTab = () => {
    if (!isLeagueView) return null;
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const tabIds = ['dashboard', 'matches', 'squads', 'table', 'stats', 'trades'];
    if (tabIds.includes(lastSegment)) {
      return lastSegment;
    }
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

  // Handle league change from dropdown
  const handleLeagueChange = (newLeagueId) => {
    if (!newLeagueId || newLeagueId === leagueId) return;
    
    const currentTab = getActiveTab() || 'dashboard';
    navigate(`/leagues/${newLeagueId}/${currentTab}`);
    setIsLeagueDropdownOpen(false);
  };

  // Handlers for Add to Home Screen button
  const handleAddToHomeScreen = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else if (isIOS) {
      showIOSInstallInstructions();
    }
    
    setIsDropdownOpen(false);
  };

  const canShowLeagueSwitcher = isLeagueView && userLeagues.length > 1;
  const isAdmin = user && user.id === 1;

  return (
    <>
      <header className="sticky top-0 z-50 w-full fix-fixed">
        {/* Liquid Glass Header Background */}
        <div className="liquid-glass-main border-0 rounded-none">
          {/* Safe area padding for notch/status bar */}
          <div className="w-full safe-area-top"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main Header Row */}
            <div className="flex items-center justify-between h-16">
              {/* Left side - Logo and League Name/Switcher */}
              <div className="flex items-center">
                <Link 
                  to="/dashboard"
                  className="flex items-center group"
                >
                  <div className="liquid-glass-card glass-rounded-md p-2 mr-3 group-hover:scale-105 transition-transform duration-200">
                    <img src="/icon.png" alt="Logo" className="h-8 w-8" />
                  </div>
                  <div className="text-xl font-extrabold text-white hover:text-primary-300 transition-colors duration-300 hidden sm:block font-caption">
                    <span className="text-primary-400">Pitch</span>Perfect
                  </div>
                </Link>
                
                {/* League Info or Switcher */}
                <div className="ml-4 sm:ml-6 sm:pl-4 sm:border-l sm:border-white/20 relative" ref={leagueDropdownRef}>
                  {canShowLeagueSwitcher && leagueInfo ? (
                    // League Switcher Dropdown Button
                    <button
                      onClick={() => setIsLeagueDropdownOpen(!isLeagueDropdownOpen)}
                      className="liquid-glass-input glass-rounded-md flex items-center gap-2 p-3 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-white font-bold font-caption text-sm leading-tight">
                          {leagueInfo.name}
                        </span>
                        {leagueInfo.season && (
                          <span className="text-xs text-primary-300 leading-tight">
                            {leagueInfo.season.name}
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                  ) : isLeagueView && leagueInfo ? (
                    // Static League Info
                    <div className="liquid-glass-input glass-rounded-md p-3">
                      <div className="text-white font-bold font-caption text-sm leading-tight">
                        {leagueInfo.name}
                      </div>
                      {leagueInfo.season && (
                        <div className="text-xs text-primary-300 leading-tight">
                          {leagueInfo.season.name}
                        </div>
                      )}
                    </div>
                  ) : isSquadView && squadInfo ? (
                    // Squad Info
                    <div className="liquid-glass-input glass-rounded-md p-3">
                      <div className="text-white font-medium text-sm leading-tight">
                        {squadInfo.name}
                      </div>
                      {squadInfo.league_name && (
                        <div className="text-xs text-primary-300 leading-tight">
                          {squadInfo.league_name}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* League Switcher Dropdown Menu */}
                  {canShowLeagueSwitcher && isLeagueDropdownOpen && (
                    <>
                      {/* Backdrop overlay to prevent text bleeding */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsLeagueDropdownOpen(false)}></div>
                      
                      <div className="absolute left-0 mt-2 w-64 py-2 liquid-glass-frosted-heavy glass-rounded-lg shadow-xl ring-1 ring-white/10 z-50 max-h-60 overflow-y-auto backdrop-blur-2xl">
                        {userLeagues.map((league) => (
                          <button
                            key={league.id}
                            onClick={() => handleLeagueChange(league.id)}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${
                              league.id === leagueInfo?.id
                                ? 'bg-primary-500/20 text-primary-600 dark:text-primary-300'
                                : 'text-slate-800 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            disabled={league.id === leagueInfo?.id}
                          >
                            <span className="font-medium">{league.name}</span>
                            {league.id === leagueInfo?.id && <Check className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
    
              {/* Right side - Navigation buttons and User Menu */}
              <div className="flex items-center gap-3">
                {/* My Squad button (for league views) */}
                {isLeagueView && leagueInfo && (
                  <Link 
                    to={leagueInfo.my_squad ? `/squads/${leagueInfo.my_squad.id}` : '#'}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium font-caption glass-rounded-md transition-all duration-200 ${
                      leagueInfo.my_squad 
                        ? 'liquid-glass-button text-white hover:scale-105' 
                        : 'liquid-glass-input text-slate-400 cursor-not-allowed'
                    }`}
                    onClick={e => (!leagueInfo.my_squad) && e.preventDefault()}
                  >
                    <Shield className="h-4 w-4" />
                    <span>My Squad</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}

                {/* Admin-only Update Points Button */}
                {isAdmin && (
                  <div className="flex-shrink-0">
                    <UpdatePointsButton />
                  </div>
                )}
    
                {/* Mid-Season Draft button (for squad views) */}
                {SHOW_MID_SEASON_DRAFT && isSquadView && squadInfo && squadInfo.user_id === user?.id && (
                  <button 
                    onClick={handleOpenDraftModal}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium glass-rounded-md text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 hover:scale-105 transition-all duration-200 animate-gradient-x"
                  >
                    <span>Mid-Season Draft</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
    
                {/* User menu */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="liquid-glass-input glass-rounded-md p-2 hover:bg-white/10 transition-all duration-200 group"
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-400" />
                      </div>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="ml-2 h-4 w-4 text-slate-400 group-hover:text-white transition-colors" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a 1 1 0 010-1.414z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </div>
                  </button>
    
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <>
                      {/* Backdrop overlay to prevent text bleeding */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                      
                      <div className="absolute right-0 mt-2 w-48 py-2 liquid-glass-frosted-heavy glass-rounded-lg shadow-xl ring-1 ring-white/10 z-50 backdrop-blur-2xl">
                        <Link
                          to="/profile"
                          className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 flex items-center w-full hover:bg-white/20 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3" />
                          Profile
                        </Link>
                        
                        <button
                          onClick={toggleTheme}
                          className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 flex items-center w-full hover:bg-white/20 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          {theme === 'light' ? (
                            <>
                              <Moon className="h-4 w-4 mr-3" />
                              Dark Mode
                            </>
                          ) : (
                            <>
                              <Sun className="h-4 w-4 mr-3" />
                              Light Mode
                            </>
                          )}
                        </button>
                        
                        {isMobile && !isStandalone && (
                          <button
                            onClick={handleAddToHomeScreen}
                            className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 flex items-center w-full hover:bg-white/20 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Home className="h-4 w-4 mr-3" />
                            Add to Home Screen
                          </button>
                        )}
                        
                        <div className="border-t border-slate-300/30 dark:border-white/10 my-2"></div>
                        
                        <button
                          onClick={logout}
                          className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 flex items-center w-full hover:bg-white/20 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Log Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* League Navigation Tabs */}
          {isLeagueView && (
            <div className="border-t border-white/10">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide" style={{WebkitOverflowScrolling: 'touch'}}>
                <nav className="flex space-x-1 min-w-max">
                  {leagueTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        whitespace-nowrap py-4 px-6 font-medium text-sm transition-all duration-200
                        touch-manipulation flex-shrink-0 relative group
                        ${activeTab === tab.id
                          ? 'text-primary-300 bg-white/5'
                          : 'text-slate-200 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      {tab.label}
                      {/* Active Tab Indicator */}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 to-primary-500"></div>
                      )}
                      {/* Hover Effect */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 to-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Render the Modal separately */}
      {isSquadView && squadInfo && (
        <MidSeasonDraftModal
          isOpen={isDraftModalOpen}
          onClose={() => setIsDraftModalOpen(false)}
          leagueId={squadInfo.league_id}
          squadId={squadId}
        />
      )}
    </>
  );
};

export default Header;