import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { 
  Home, Calendar, Shield, BarChart3, Trophy, UsersRound, MoreHorizontal, X
} from 'lucide-react';

const BottomNavigation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Extract leagueId from URL path pattern
  const getLeagueIdFromPath = () => {
    const match = location.pathname.match(/\/leagues\/([^\/]+)/);
    return match ? match[1] : null;
  };

  // Extract squadId from URL path pattern (for legacy routes)
  const getSquadIdFromPath = () => {
    const match = location.pathname.match(/\/squads\/([^\/]+)/);
    return match ? match[1] : null;
  };
  
  const leagueId = getLeagueIdFromPath();
  const squadId = getSquadIdFromPath();
  const isLeagueView = location.pathname.includes('/leagues/') && leagueId;
  const isSquadView = location.pathname.includes('/squads/') && squadId;
  const isMySquadView = location.pathname.includes('/my_squad');

  // Only show bottom navigation when in league context (same logic as header tabs)
  const shouldShowBottomNav = isLeagueView || isSquadView;

  // Detect standalone mode
  useEffect(() => {
    const checkStandalone = () => {
      const isRunningStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://');
      
      setIsStandalone(isRunningStandalone);
    };
    
    checkStandalone();
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);
    
    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

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
    } else if (isSquadView && squadId) {
      // For legacy squad routes, fetch squad info to get league context
      const fetchSquadInfo = async () => {
        try {
          const response = await api.get(`/squads/${squadId}/`);
          const squadInfo = response.data;
          
          // Create a mock league info object for navigation
          setLeagueInfo({
            id: squadInfo.league_id,
            name: squadInfo.league_name,
            my_squad: { id: squadInfo.id }
          });
        } catch (err) {
          console.error('Failed to fetch squad info:', err);
          setLeagueInfo(null);
        }
      };
      
      fetchSquadInfo();
    } else {
      setLeagueInfo(null);
    }
  }, [isLeagueView, isSquadView, leagueId, squadId]);
  
  // Determine the active tab
  const getActiveTab = () => {
    if (!isLeagueView && !isSquadView) {
      return 'dashboard';
    }

    // Handle my_squad route
    if (isMySquadView) {
      return 'my-squad';
    }

    // Handle legacy squad route
    if (isSquadView) {
      return 'my-squad';
    }

    // Handle league routes
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const tabIds = ['dashboard', 'matches', 'squads', 'table', 'stats', 'trades'];
    if (tabIds.includes(lastSegment)) {
      return lastSegment;
    }
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  // Navigation tabs configuration
  const tabs = [
    { id: 'my-squad', label: 'My Squad', icon: Shield },
    { id: 'matches', label: 'Matches', icon: Calendar },
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'table', label: 'Standings', icon: Trophy },
    { id: 'squads', label: 'Squads', icon: UsersRound },
  ];

  // Main navigation tabs (for bottom bar)
  const mainTabs = ['my-squad', 'matches', 'dashboard', 'stats', 'more'];
  const moreItems = ['table', 'squads'];
  
  // Handle tab change
  const handleTabChange = (tabId) => {
    if (tabId === 'more') {
      setShowMoreMenu(true);
      return;
    }

    setShowMoreMenu(false);
    
    // Get the league ID (either from current context or from league info)
    const currentLeagueId = leagueId || leagueInfo?.id;
    
    if (!currentLeagueId) {
      if (tabId === 'dashboard') {
        navigate('/dashboard');
      }
      return;
    }

    if (tabId === 'my-squad' && leagueInfo?.my_squad) {
      // Use new route structure
      navigate(`/leagues/${currentLeagueId}/my_squad`);
    } else if (tabId !== 'my-squad') {
      navigate(`/leagues/${currentLeagueId}/${tabId}`);
    }
  };

  const handleMoreItemClick = (tabId) => {
    const currentLeagueId = leagueId || leagueInfo?.id;
    
    if (currentLeagueId) {
      navigate(`/leagues/${currentLeagueId}/${tabId}`);
    }
    setShowMoreMenu(false);
  };

  // Get tab info helper
  const getTabInfo = (tabId) => {
    if (tabId === 'more') {
      return { label: 'More', icon: MoreHorizontal };
    }
    return tabs.find(tab => tab.id === tabId);
  };

  // Don't render if not in league context
  if (!shouldShowBottomNav) {
    return null;
  }

  return (
    <>
      {/* Fixed Bottom Navigation - Mobile Only, Edge to Edge */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          transition: 'transform 0.3s ease'
        }}
      >
        {/* Edge to edge glass container */}
        <div className="lg-glass border-t border-white/30 dark:border-gray-700/40 shadow-2xl shadow-black/20 dark:shadow-black/40">
          {/* Navigation content */}
          <div className="relative flex items-center justify-around px-2 py-3">
            {mainTabs.map((tabId, index) => {
              const tabInfo = getTabInfo(tabId);
              const Icon = tabInfo.icon;
              const isActive = activeTab === tabId;
              const isCenter = index === 2; // Dashboard is the 3rd button (index 2)
              const isMySquad = tabId === 'my-squad';
              const isDisabled = isMySquad && (!leagueInfo?.my_squad);
              
              return (
                <button
                  key={tabId}
                  onClick={() => !isDisabled && handleTabChange(tabId)}
                  disabled={isDisabled}
                  className={`
                    group relative flex flex-col items-center justify-center min-w-0 flex-1 transition-all duration-300 ease-out py-1
                    ${isCenter ? 'transform -translate-y-1' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {/* Tab background */}
                  <div className={`
                    relative flex items-center justify-center transition-all duration-300 ease-out lg-rounded-lg
                    ${isCenter ? 'w-12 h-12' : 'w-8 h-8'}
                    ${isActive 
                      ? 'lg-glass-secondary backdrop-blur-lg shadow-md border border-white/40 dark:border-gray-600/40' 
                      : !isDisabled && 'hover:lg-glass-tertiary'
                    }
                  `}>
                    {/* Icon */}
                    <Icon 
                      size={isCenter ? 24 : 18} 
                      className={`
                        transition-all duration-300 ease-out
                        ${isActive 
                          ? 'text-primary-600 dark:text-primary-400' 
                          : isDisabled
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                        }
                      `} 
                    />
                    
                    {/* Active indicator glow */}
                    {isActive && (
                      <div className="absolute inset-0 lg-rounded-lg bg-gradient-to-br from-primary-500/20 to-cyan-500/20 blur-sm"></div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`
                    text-xs font-medium mt-1 transition-all duration-300 ease-out
                    ${isActive 
                      ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                      : isDisabled
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                    }
                  `}>
                    {tabInfo.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* More Menu - Enhanced Liquid Glass Modal */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-[10000] flex items-end md:hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000
          }}
        >
          <div 
            className="absolute inset-0 lg-modal-backdrop"
            onClick={() => setShowMoreMenu(false)}
          />
          
          <div 
            className="relative w-full animate-in slide-in-from-bottom-4 duration-300 ease-out"
            style={{
              // Adjust modal positioning for standalone mode too
              marginBottom: isStandalone 
                ? 'calc(env(safe-area-inset-bottom, 0px) + 80px)' 
                : 'calc(env(safe-area-inset-bottom, 0px) + 72px)'
            }}
          >
            <div className="lg-sheet lg-rounded-t-2xl overflow-hidden" style={{ borderRadius: '24px 24px 0 0' }}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300/60 dark:bg-gray-600/60 lg-rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-gray-700/30">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  More Options
                </h3>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 lg-rounded-lg hover:lg-glass-tertiary transition-all duration-200"
                >
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="px-4 py-4 space-y-2">
                {moreItems.map((tabId) => {
                  const tabInfo = getTabInfo(tabId);
                  const Icon = tabInfo.icon;
                  const isActive = activeTab === tabId;
                  
                  return (
                    <button
                      key={tabId}
                      onClick={() => handleMoreItemClick(tabId)}
                      className={`
                        w-full flex items-center gap-4 px-4 py-4 lg-rounded-xl transition-all duration-200
                        ${isActive 
                          ? 'lg-glass-primary text-primary-600 dark:text-primary-400 border border-primary-500/30 shadow-lg' 
                          : 'text-gray-700 dark:text-gray-300 hover:lg-glass-tertiary border border-transparent'
                        }
                      `}
                    >
                      <Icon size={24} />
                      <span className="font-medium text-lg">{tabInfo.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2.5 h-2.5 bg-primary-500 rounded-full shadow-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Safe area spacing */}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNavigation;