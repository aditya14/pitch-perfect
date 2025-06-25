import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from '../../utils/axios';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useAuth } from '../../context/AuthContext';

// Import tab components
import LeagueDashboard from './LeagueDashboard';
import MatchList from './MatchList';
import LeagueTable from './LeagueTable';
import TradeList from './TradeList';
import TradeTutorial from './TradeTutorial';
import LeagueStats from './LeagueStats';
import DraftOrderModal from './modals/DraftOrderModal';
import LeagueSquads from './LeagueSquads';
import SquadView from '../squads/SquadView'; // Import SquadView for My Squad tab

// Constants 
const DRAFT_DEADLINE = new Date('2025-03-21T14:00:00Z'); // March 21, 2025 10:00 AM ET

const LeagueView = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [players, setPlayers] = useState([]);
  const [draftOrder, setDraftOrder] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSaveError, setDraftSaveError] = useState(null);
  const [isDraftDeadlinePassed, setIsDraftDeadlinePassed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mySquadId, setMySquadId] = useState(null);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define the core tabs that are always available
  const getCoreTabs = useCallback(() => {
    const tabs = [
      { id: 'dashboard', label: 'Dashboard', component: LeagueDashboard },
      { id: 'matches', label: 'Matches', component: MatchList },
    ];

    // Add My Squad tab if user has a squad in this league
    if (mySquadId) {
      tabs.push({ id: 'my_squad', label: 'My Squad', component: SquadView });
    }

    tabs.push(
      { id: 'squads', label: 'Squads', component: LeagueSquads },
      { id: 'table', label: 'Standings', component: LeagueTable },
      { id: 'stats', label: 'Stats', component: LeagueStats }
    );

    return tabs;
  }, [mySquadId]);

  // Create tabs based on draft status
  const getTabs = useCallback((isDraftCompleted) => {
    const allTabs = [...getCoreTabs()];
    
    // Add trades tab with the appropriate component based on draft status
    if (isDraftCompleted) {
      allTabs.push({ id: 'trades', label: 'Trades', component: TradeList });
    } else {
      allTabs.push({ id: 'trades', label: 'Trades', component: TradeTutorial });
    }
    
    return allTabs;
  }, [getCoreTabs]);

  // Initialize tabs with empty draft status, will be updated after league data loads
  const [tabs, setTabs] = useState([]);

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

  // Get active tab from URL path
  const activeTab = getActiveTabFromPath();
  
  // Set the dynamic document title based on league name and active tab
  const getPageTitle = () => {
    if (!league) return 'League';
    
    const foundLabel = tabs.find(tab => tab.id === activeTab)?.label || '';
    const activeTabLabel = foundLabel === 'Dashboard' ? '' : foundLabel;
    return `${league.name}${activeTabLabel ? ' - ' + activeTabLabel : ''}`;
  };
  
  // Apply the document title
  useDocumentTitle(getPageTitle());

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
      const leagueData = response.data;
      setLeague(leagueData);
      
      // Set mySquadId if user has a squad in this league
      if (leagueData.my_squad) {
        setMySquadId(leagueData.my_squad.id);
      }
      
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this league');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch league data');
      }
    }
  };

  // Update tabs when league data or my squad changes
  useEffect(() => {
    if (league) {
      setTabs(getTabs(league.draft_completed));
      setLoading(false);
    }
  }, [league, getTabs]);

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
        setDraftSaveError("Failed to load data. Please try again.");
      } finally {
        setDraftLoading(false);
      }
    };
    
    // Start the loading process
    loadData();
  };

  useEffect(() => {
    fetchLeagueData();
  }, [leagueId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
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
  
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  // Special handling for My Squad component to pass the correct props
  const renderActiveComponent = () => {
    if (activeTab === 'my_squad' && mySquadId) {
      return <SquadView squadId={mySquadId} leagueContext={true} />;
    }
    return ActiveComponent && <ActiveComponent league={league} />;
  };

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Tab Content */}
      {renderActiveComponent()}
      
      {/* This is where nested routes would render */}
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