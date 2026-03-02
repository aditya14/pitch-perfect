import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { 
  Moon, Sun, Home, LogOut, User, 
  ChevronsUpDown, Check, Shield, Calendar, UsersRound, Trophy, BarChart3
} from 'lucide-react';
import UpdatePointsButton from './UpdatePointsButton';

const parseSeasonDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSeasonBucket = (season, referenceDate = new Date()) => {
  if (!season) return null;

  const status = (season.status || '').toString().trim().toUpperCase();
  const startDate = parseSeasonDate(season.start_date);
  const endDate = parseSeasonDate(season.end_date);

  if (startDate && startDate > referenceDate) return 'UPCOMING';
  if (status === 'UPCOMING') return 'UPCOMING';

  if (status === 'COMPLETED') return 'COMPLETED';
  if (endDate && endDate < referenceDate) return 'COMPLETED';

  if (status === 'ONGOING') return 'ONGOING';
  if (startDate && startDate <= referenceDate && (!endDate || endDate >= referenceDate)) {
    return 'ONGOING';
  }

  return status || null;
};

const Header = ({ theme, onThemeChange }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobile, setIsMobile] = useState(false);
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [squadInfo, setSquadInfo] = useState(null);
  const [userLeagues, setUserLeagues] = useState([]);
  const [isLeagueDropdownOpen, setIsLeagueDropdownOpen] = useState(false);
  const leagueDropdownRef = useRef(null);

  // Extract leagueId from URL path pattern
  const getLeagueIdFromPath = () => {
    const match = location.pathname.match(/\/leagues\/([^/]+)/);
    if (!match) return null;
    const candidate = match[1]?.toLowerCase();
    if (candidate === 'join' || candidate === 'create') return null;
    return match[1];
  };

  // Extract squadId from URL path pattern (for legacy routes)
  const getSquadIdFromPath = () => {
    const match = location.pathname.match(/\/squads\/([^/]+)/);
    return match ? match[1] : null;
  };
  
  const leagueId = getLeagueIdFromPath();
  const squadId = getSquadIdFromPath();
  const isLeagueView = location.pathname.includes('/leagues/') && leagueId;
  const isSquadView = location.pathname.includes('/squads/') && squadId;
  const hideBrandText = isLeagueView && isMobile;
  
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
          const activeLeagues = (response.data || []).filter((league) => {
            const seasonBucket = getSeasonBucket(league.season, new Date());
            return seasonBucket === 'ONGOING' || seasonBucket === 'UPCOMING';
          });
          setUserLeagues(activeLeagues);
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

  // Fetch squad info when in squad view (legacy route)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
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
  };
  
  // If we're in a league view, determine the active tab
  const getActiveTab = () => {
    if (!isLeagueView) return null;
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const tabIds = ['dashboard', 'draft', 'matches', 'squads', 'table', 'stats', 'trades', 'my_squad'];
    if (tabIds.includes(lastSegment)) {
      return lastSegment;
    }
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const tabIconMap = {
    dashboard: Home,
    matches: Calendar,
    my_squad: Shield,
    squads: UsersRound,
    table: Trophy,
    stats: BarChart3,
  };

  const getIsPreDraftPhase = () => {
    if (!leagueInfo?.season) return false;
    if (leagueInfo?.draft_completed) return false;

    const status = (leagueInfo.season.status || '').toString().toUpperCase();
    const startDate = leagueInfo.season.start_date ? new Date(leagueInfo.season.start_date) : null;
    const hasFutureStart = startDate && !Number.isNaN(startDate.getTime()) && startDate > new Date();

    return status === 'UPCOMING' || hasFutureStart;
  };

  const isPreDraftPhase = getIsPreDraftPhase();

  // League navigation tabs
  const leagueTabs = isPreDraftPhase
    ? [
        { id: 'dashboard', label: 'Draft' },
        { id: 'matches', label: 'Matches' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard' },
        ...(leagueInfo?.my_squad ? [{ id: 'my_squad', label: 'My Squad' }] : []),
        { id: 'matches', label: 'Matches' },
        { id: 'squads', label: 'Squads' },
        { id: 'stats', label: 'Stats' },
        // { id: 'trades', label: 'Trades' },
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

  const canShowLeagueSwitcher = isLeagueView && userLeagues.length > 1;
  const isAdmin = !!(user?.is_staff || user?.is_superuser || user?.id === 1);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700">
        <div className="lg-nav border-0 rounded-none">
          {/* Safe area padding for notch/status bar */}
          <div className="w-full safe-area-top"></div>
          
          <div className="container mx-auto px-2 sm:px-6 lg:px-8">
            {/* Main Header Row */}
            <div className="flex items-center justify-between h-16 flex-nowrap">
              {/* Left side - Logo and League Name/Switcher */}
              <div className="flex items-center min-w-0">
                <Link 
                  to="/dashboard"
                  className="flex items-center group flex-shrink-0"
                >
                  <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center">
                    <img src="/icon.png" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl" />
                  </div>
                  <div className={`ml-3 ${hideBrandText ? 'hidden' : 'block'}`}>
                    <h1 className="text-md sm:text-lg font-bold font-caption bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                      Pitch Perfect
                    </h1>
                  </div>
                </Link>
                
                {/* League Info or Switcher */}
                <div className="ml-2 sm:ml-6 sm:pl-4 sm:border-l sm:border-white/20 relative min-w-0" ref={leagueDropdownRef}>
                  {canShowLeagueSwitcher && leagueInfo ? (
                    // League Switcher Dropdown Button
                    <button
                      onClick={() => setIsLeagueDropdownOpen(!isLeagueDropdownOpen)}
                      className="lg-glass-tertiary lg-rounded-md flex items-center gap-2 py-1 px-2 pl-3 transition-colors group hover:bg-[rgba(31,190,221,0.1)] dark:hover:bg-[rgba(31,190,221,0.15)] min-w-0 max-w-[60vw] sm:max-w-xs overflow-x-auto"
                      style={{whiteSpace: 'nowrap'}}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-primary-900 dark:text-white font-bold font-caption text-sm leading-tight group-hover:text-[rgb(31,190,221)] dark:group-hover:text-[rgb(51,214,241)] transition-colors truncate max-w-[40vw] sm:max-w-[10rem]">
                          {leagueInfo.name}
                        </span>
                        {leagueInfo.season && (
                          <span className="text-xs text-primary-300 leading-tight group-hover:text-[rgb(31,190,221)] dark:group-hover:text-[rgb(51,214,241)] transition-colors truncate max-w-[40vw] sm:max-w-[10rem]">
                            {leagueInfo.season.name}
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-[rgb(31,190,221)] dark:group-hover:text-[rgb(51,214,241)] transition-colors flex-shrink-0" />
                    </button>
                  ) : isLeagueView && leagueInfo ? (
                    // Static League Info
                    <div className="p-1 min-w-0 max-w-[60vw] sm:max-w-xs overflow-x-auto" style={{whiteSpace: 'nowrap'}}>
                      <div className="text-slate-900 dark:text-white font-bold font-caption text-sm leading-tight truncate max-w-[40vw] sm:max-w-[10rem]">
                        {leagueInfo.name}
                      </div>
                      {leagueInfo.season && (
                        <div className="text-xs text-slate-500 dark:text-slate-300 leading-tight truncate max-w-[40vw] sm:max-w-[10rem]">
                          {leagueInfo.season.name}
                        </div>
                      )}
                    </div>
                  ) : isSquadView && squadInfo ? (
                    // Squad Info (for legacy route)
                    <div className="lg-glass-tertiary lg-rounded-md p-3 min-w-0 max-w-[60vw] sm:max-w-xs overflow-x-auto" style={{whiteSpace: 'nowrap'}}>
                      <div className="text-slate-900 dark:text-white font-medium text-sm leading-tight truncate max-w-[40vw] sm:max-w-[10rem]">
                        {squadInfo.name}
                      </div>
                      {squadInfo.league_name && (
                        <div className="text-xs text-slate-600 dark:text-primary-300 leading-tight truncate max-w-[40vw] sm:max-w-[10rem]">
                          {squadInfo.league_name}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* League Switcher Dropdown Menu */}
                  {canShowLeagueSwitcher && isLeagueDropdownOpen && (
                    <>
                      <div className="absolute left-0 mt-2 w-64 py-2 lg-dropdown max-h-60 overflow-y-auto z-50">
                        {userLeagues.map((league) => (
                          <button
                            key={league.id}
                            onClick={() => handleLeagueChange(league.id)}
                            className={`lg-dropdown-item w-full text-left flex items-center justify-between ${
                              league.id === leagueInfo?.id
                                ? 'bg-primary-500/20 text-primary-600 dark:text-primary-300'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                            disabled={league.id === leagueInfo?.id}
                          >
                            <span className="font-medium truncate">{league.name}</span>
                            {league.id === leagueInfo?.id && <Check className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* League Navigation Tabs - Desktop only */ }
                {isLeagueView && (
                  <nav className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-white/10 overflow-x-auto scrollbar-hide">
                    {leagueTabs.map(tab => {
                      const Icon = tabIconMap[tab.id];
                      const isAlwaysIconOnly = tab.id === 'dashboard';
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          aria-label={tab.label}
                          className={`
                            group relative inline-flex items-center gap-0 xl:gap-2 px-2 xl:px-3 py-2 lg-rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200
                            ${activeTab === tab.id
                              ? 'lg-glass-secondary text-primary-600 dark:text-primary-300'
                              : 'text-slate-700 dark:text-slate-300 hover:lg-glass-tertiary hover:text-primary-600 dark:hover:text-primary-300'
                            }
                          `}
                        >
                          {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                          <span className={isAlwaysIconOnly ? 'hidden' : 'hidden xl:inline'}>{tab.label}</span>
                          <span className={`${isAlwaysIconOnly ? '' : 'xl:hidden '}pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 whitespace-nowrap`}>
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
    
              {/* Right side - Action buttons and User Menu */}
              <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
                <button
                  onClick={toggleTheme}
                  className="lg-glass-tertiary rounded-full p-2 border border-neutral-200/70 dark:border-white/10 text-slate-800 dark:text-slate-200 transition-all duration-200 hover:bg-[rgba(31,190,221,0.1)] dark:hover:bg-[rgba(31,190,221,0.15)]"
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  type="button"
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>

                <Link
                  to="/profile"
                  className="lg-glass-tertiary rounded-full p-2 border border-neutral-200/70 dark:border-white/10 text-slate-800 dark:text-slate-200 transition-all duration-200 hover:bg-[rgba(31,190,221,0.1)] dark:hover:bg-[rgba(31,190,221,0.15)]"
                  aria-label="Profile"
                  title="Profile"
                >
                  <User className="h-4 w-4" />
                </Link>

                <div className="h-6 w-px bg-neutral-300/80 dark:bg-white/20" aria-hidden="true" />

                <button
                  onClick={logout}
                  className="lg-glass-tertiary rounded-full p-2 border border-neutral-200/70 dark:border-white/10 text-slate-800 dark:text-slate-200 transition-all duration-200 hover:bg-[rgba(31,190,221,0.1)] dark:hover:bg-[rgba(31,190,221,0.15)]"
                  aria-label="Log out"
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                {isAdmin && !isMobile && (
                  <UpdatePointsButton variant="header" />
                )}
              </div>
            </div>
          </div>
          
        </div>
      </header>
    </>
  );
};

export default Header;
