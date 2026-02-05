import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Outlet } from 'react-router-dom';
import api from '../../utils/axios';
import useDocumentTitle from '../../hooks/useDocumentTitle';

// Import tab components
import LeagueDashboard from './LeagueDashboard';
import MatchList from './MatchList';
import LeagueTable from './LeagueTable';
import TradeList from './TradeList';
import TradeTutorial from './TradeTutorial';
import LeagueStats from './LeagueStats';
import LeagueSquads from './LeagueSquads';
import SquadView from '../squads/SquadView'; // Import SquadView for My Squad tab
import PreSeasonDraftPanel from './PreSeasonDraftPanel';

const LeagueView = () => {
  const { leagueId } = useParams();
  const location = useLocation();
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mySquadId, setMySquadId] = useState(null);

  const getCoreTabs = useCallback((isPreDraftPhase) => {
    if (isPreDraftPhase) {
      return [
        { id: 'dashboard', label: 'Draft', component: LeagueDashboard },
        { id: 'matches', label: 'Matches', component: MatchList },
        { id: 'table', label: 'Standings', component: LeagueTable },
      ];
    }

    const tabs = [
      { id: 'dashboard', label: 'Dashboard', component: LeagueDashboard },
      { id: 'matches', label: 'Matches', component: MatchList },
    ];

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
  const getTabs = useCallback((isDraftCompleted, isPreDraftPhase) => {
    const allTabs = [...getCoreTabs(isPreDraftPhase)];

    if (isPreDraftPhase) {
      return allTabs;
    }
    
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

  const fetchLeagueData = useCallback(async () => {
    try {
      const response = await api.get(`/leagues/${leagueId}/`);
      const leagueData = response.data;
      setLeague(leagueData);
      
      // Set mySquadId if user has a squad in this league
      if (leagueData.my_squad) {
        setMySquadId(leagueData.my_squad.id);
      } else {
        setMySquadId(null);
      }

      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this league');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch league data');
      }
    }
  }, [leagueId]);

  // Update tabs when league data or my squad changes
  useEffect(() => {
    if (league) {
      const seasonStartDate = league?.season?.start_date ? new Date(league.season.start_date) : null;
      const isSeasonUpcoming =
        (league?.season?.status || '').toUpperCase() === 'UPCOMING' ||
        (seasonStartDate && !Number.isNaN(seasonStartDate.getTime()) && seasonStartDate > new Date());
      const isPreDraftPhase = isSeasonUpcoming && !league.draft_completed;

      setTabs(getTabs(league.draft_completed, isPreDraftPhase));
      setLoading(false);
    }
  }, [league, getTabs]);

  useEffect(() => {
    fetchLeagueData();
  }, [fetchLeagueData]);

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
  const seasonStartDate = league?.season?.start_date ? new Date(league.season.start_date) : null;
  const isSeasonUpcoming =
    (league?.season?.status || '').toUpperCase() === 'UPCOMING' ||
    (seasonStartDate && !Number.isNaN(seasonStartDate.getTime()) && seasonStartDate > new Date());
  const isPreDraftPhase = isSeasonUpcoming && !league?.draft_completed;

  // Special handling for My Squad component to pass the correct props
  const renderActiveComponent = () => {
    if (activeTab === 'my_squad' && mySquadId) {
      return <SquadView squadId={mySquadId} leagueContext={true} />;
    }
    if (activeTab === 'dashboard' && isPreDraftPhase) {
      return <PreSeasonDraftPanel league={league} leagueId={leagueId} />;
    }
    return ActiveComponent && <ActiveComponent league={league} />;
  };

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Tab Content */}
      {renderActiveComponent()}
      
      {/* This is where nested routes would render */}
      <Outlet />
    </div>
  );
};

export default LeagueView;
