import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { Trophy, Users, ChevronRight, RefreshCw, FileEdit, Clock, ArrowLeft } from 'lucide-react';
import api from '../../utils/axios';

// Import tab components
import LeagueDashboard from './LeagueDashboard';
import MatchList from './MatchList';
import LeagueTable from './LeagueTable';
import TradeList from './TradeList';
import TradeTutorial from './TradeTutorial';
import LeagueStats from './LeagueStats';
import DraftOrderModal from './modals/DraftOrderModal';

// Constants 
const DRAFT_DEADLINE = new Date('2025-03-21T14:00:00Z'); // March 21, 2025 10:00 AM ET

// Countdown component
const DraftCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({});
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = DRAFT_DEADLINE - new Date();
      
      if (difference <= 0) {
        setIsExpired(true);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isExpired) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
        <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse"></span>
        Draft order locked
      </div>
    );
  }

  return (
    <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
      <Clock className="h-4 w-4" />
      <span>
        Draft locks in: 
        {timeLeft.days > 0 && <span className="font-medium ml-1">{timeLeft.days}d</span>}
        {timeLeft.hours > 0 && <span className="font-medium ml-1">{timeLeft.hours}h</span>}
        <span className="font-medium ml-1">{timeLeft.minutes}m</span>
      </span>
    </div>
  );
};

const LeagueView = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [players, setPlayers] = useState([]);
  const [draftOrder, setDraftOrder] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSaveError, setDraftSaveError] = useState(null);
  const [isDraftDeadlinePassed, setIsDraftDeadlinePassed] = useState(false);

  // Define the core tabs that are always available
  const coreTabs = [
    { id: 'dashboard', label: 'Dashboard', component: LeagueDashboard },
    { id: 'matches', label: 'Matches', component: MatchList },
    { id: 'stats', label: 'Stats', component: LeagueStats },
  ];

  // Create tabs based on draft status
  const getTabs = useCallback((isDraftCompleted) => {
    const allTabs = [...coreTabs];
    
    // Add trades tab with the appropriate component based on draft status
    if (isDraftCompleted) {
      allTabs.push({ id: 'trades', label: 'Trades', component: TradeList });
    } else {
      allTabs.push({ id: 'trades', label: 'Trades', component: TradeTutorial });
    }
    
    return allTabs;
  }, []);

  // Initialize tabs with empty draft status, will be updated after league data loads
  const [tabs, setTabs] = useState(getTabs(false));

  // Get current active tab from URL path
  const getActiveTabFromPath = () => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Check if the last segment is one of our tabs
    const tabIds = tabs.map(tab => tab.id);
    if (tabIds.includes(lastSegment)) {
      return lastSegment;
    }
    
    // Default to dashboard if not found
    return 'dashboard';
  };

  // Check if draft deadline has passed
  useEffect(() => {
    const checkDeadline = () => {
      const now = new Date();
      setIsDraftDeadlinePassed(now >= DRAFT_DEADLINE);
    };
    
    checkDeadline();
    const timer = setInterval(checkDeadline, 30000); // Check every 30 seconds
    
    return () => clearInterval(timer);
  }, []);

  // Fetch league data
  const fetchLeagueData = async () => {
    try {
      const response = await api.get(`/leagues/${leagueId}/`);
      console.log('League:', response.data);
      setLeague(response.data);
      
      // Update tabs based on draft status
      setTabs(getTabs(response.data.draft_completed));
      
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this league');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch league data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch player data
  const fetchPlayerData = useCallback(async () => {
    if (!league?.season?.id) return;
    
    try {
      const playersResponse = await api.get(
        `/leagues/${leagueId}/players?season=${league.season.id}`
      );
      setPlayers(playersResponse.data);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  }, [leagueId, league]);

  // Fetch draft order data
  const fetchDraftOrder = useCallback(async () => {
    try {
      const response = await api.get(`/drafts/get_draft_order/?league_id=${leagueId}`);
      setDraftOrder(response.data);
      setDraftSaveError(null);
      return response.data;
    } catch (err) {
      console.error('Error fetching draft order:', err);
      setDraftSaveError(err.response?.data?.detail || 'Failed to fetch draft order');
      throw err;
    }
  }, [leagueId]);

  // Save draft order
  const saveDraftOrder = async (newOrder) => {
    if (!draftOrder?.id) return;
    
    try {
      await api.patch(`/drafts/${draftOrder.id}/update_order/`, {
        order: newOrder
      });
      setDraftOrder(prev => ({...prev, order: newOrder}));
      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to save draft order';
      setDraftSaveError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  

  const handleDraftModalOpen = () => {
    // Open the modal immediately
    setIsDraftModalOpen(true);
    
    // Start loading data
    setDraftLoading(true);
    
    // Load player data if needed, then fetch draft order
    const loadData = async () => {
      try {
        // Load players if they're not loaded yet
        if (players.length === 0) {
          await fetchPlayerData();
        }
        
        // Then fetch draft order
        await fetchDraftOrder();
      } catch (err) {
        console.error("Error loading draft data:", err);
        setDraftSaveError("Failed to load draft data. Please try again.");
      } finally {
        setDraftLoading(false);
      }
    };
    
    // Start the loading process
    loadData();
  };

  // Handle tab change
  const handleTabChange = (tabId) => {
    navigate(`/leagues/${leagueId}/${tabId}`);
  };

  useEffect(() => {
    fetchLeagueData();
  }, [leagueId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const isUpcomingSeason = league?.season?.status === 'UPCOMING';
  const isDraftAllowed = isUpcomingSeason && new Date(league?.season?.start_date) > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const isDraftCompleted = league?.draft_completed;
  const canUpdateDraft = isDraftAllowed && !isDraftCompleted && !isDraftDeadlinePassed;
  
  // Get active tab from URL path
  const activeTab = getActiveTabFromPath();
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* League Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
          <nav className="flex items-center mb-4">
          <Link to="/" className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
            <ArrowLeft size={20} className="mr-1" />
            Back to Dashboard
          </Link>
        </nav>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {league?.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {league?.season?.name ? `${league.season.name}` : 'Loading season...'}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {/* Draft Countdown - Always visible if draft not completed */}
            {isDraftAllowed && !isDraftCompleted && (
              <DraftCountdown />
            )}
            
            {/* Buttons row */}
            <div className="flex flex-wrap gap-3">
              {/* Draft Order Button - Show only if draft not yet completed */}
              {isDraftAllowed && !isDraftCompleted && (
                <button 
                  onClick={handleDraftModalOpen}
                  disabled={isDraftDeadlinePassed}
                  className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium 
                    ${isDraftDeadlinePassed 
                      ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900'
                    }
                  `}
                >
                  <FileEdit className={`h-4 w-4 ${isDraftDeadlinePassed ? 'text-gray-400 dark:text-gray-500' : ''}`} />
                  Update Draft Order
                </button>
              )}
              
              <Link 
                to={league?.my_squad && isDraftCompleted ? `/squads/${league.my_squad.id}` : '#'}
                className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium
                          ${(isDraftCompleted && league?.my_squad) 
                            ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 focus:ring-indigo-500' 
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
                          }
                          focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
                onClick={e => (!isDraftCompleted || !league?.my_squad) && e.preventDefault()}
              >
                <Trophy className="h-4 w-4" />
                My Squad
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {ActiveComponent && <ActiveComponent league={league} />}
      
      {/* This is where nested routes would render, but we handle that manually above */}
      <Outlet />
      
      {/* Draft Order Modal */}
      <DraftOrderModal 
        isOpen={isDraftModalOpen} 
        onClose={() => setIsDraftModalOpen(false)}
        leagueId={leagueId}
        players={players}
        fetchDraftOrder={fetchDraftOrder}
        saveDraftOrder={saveDraftOrder}
        draftOrder={draftOrder}
        isLoading={draftLoading}
        saveError={draftSaveError}
      />
    </div>
  );
};

export default LeagueView;