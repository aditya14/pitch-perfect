import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import MatchOverview from './cards/MatchOverview';
import MatchPerformanceContainer from './cards/MatchPerformanceContainer';
import SquadPerformance from './cards/SquadPerformance';
import { getEventData } from '../../utils/matchUtils';

const MatchView = () => {
  const { matchId, leagueId } = useParams();
  const [playerEvents, setPlayerEvents] = useState([]);
  const [matchOverview, setMatchOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'total_points_all', direction: 'desc' });
  const [activeSquadId, setActiveSquadId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [leagueName, setLeagueName] = useState('');

  // Dynamic document title
  const getPageTitle = () => {
    if (!matchOverview) return 'Match Details';
    
    const date = new Date(matchOverview.date);
    const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
    const matchTitle = matchOverview.title ||
              `${matchOverview.team_1?.short_name || 'Team 1'} vs ${matchOverview.team_2?.short_name || 'Team 2'}, ${formattedDate}`;
    
    if (leagueId && leagueName) {
      return `${matchTitle} (${leagueName})`;
    }
    
    return matchTitle;
  };
  
  // Apply the document title
  useDocumentTitle(getPageTitle());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchMatchData();
    fetchMatchOverview();
    
    // If we're viewing in league context, get the active user's squad ID
    if (leagueId) {
      fetchActiveSquad();
      fetchLeagueInfo();
    }
  }, [matchId, leagueId]);

  const fetchLeagueInfo = async () => {
    if (!leagueId) return;
    
    try {
      const response = await api.get(`/leagues/${leagueId}/`);
      setLeagueName(response.data.name);
    } catch (err) {
      console.error('Error fetching league info:', err);
    }
  };

  const fetchActiveSquad = async () => {
    try {
      const response = await api.get(`/leagues/${leagueId}/my-squad/`);
      setActiveSquadId(response.data.id);
    } catch (err) {
      console.error('Error fetching active squad:', err);
    }
  };

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const endpoint = leagueId
        ? `/leagues/${leagueId}/matches/${matchId}/events/`
        : `/matches/${matchId}/events/`;
      const response = await api.get(endpoint);
      
      // Sort by total points by default
      const sortedEvents = sortEventsByTotalPoints(response.data, leagueId);
      setPlayerEvents(sortedEvents);
      setError(null);
    } catch (err) {
      setError('Failed to fetch match data');
      console.error('Error fetching match data:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortEventsByTotalPoints = (events, hasLeagueId) => {
    // Map the data to a simpler structure first to avoid nested property issues
    const mappedData = events.map((event, index) => ({
      originalEvent: event,
      originalIndex: index,
      ...getEventData(event)
    }));
    
    // Sort the mapped data by total points
    const sortedMappedData = [...mappedData].sort((a, b) => {
      const aPoints = hasLeagueId ? (a.fantasy_points || 0) : (a.total_points_all || 0);
      const bPoints = hasLeagueId ? (b.fantasy_points || 0) : (b.total_points_all || 0);
      return bPoints - aPoints; // Descending order
    });
    
    // Get the original events in sorted order
    return sortedMappedData.map(item => events[item.originalIndex]);
  };

  const fetchMatchOverview = async () => {
    try {
      const response = await api.get(`/matches/${matchId}/`);
      setMatchOverview(response.data);
    } catch (err) {
      console.error('Error fetching match overview:', err);
    }
  };

  const handleSort = (key) => {
    setSortConfig((currentConfig) => {
      const newDirection = 
        currentConfig.key === key && currentConfig.direction === 'desc'
          ? 'asc'
          : 'desc';

      // Map the data to a simpler structure first to avoid nested property issues
      const mappedData = playerEvents.map((event, index) => ({
        originalEvent: event,
        originalIndex: index,
        ...getEventData(event)
      }));
      
      // Sort the mapped data
      const sortedMappedData = [...mappedData].sort((a, b) => {
        let aValue = a[key];
        let bValue = b[key];

        // Handle special case for strings
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        // Handle special case for numbers
        if (['bat_runs', 'bat_balls', 'bat_fours', 'bat_sixes', 'bat_strike_rate', 
             'batting_points_total', 'bowl_balls', 'bowl_maidens', 'bowl_runs', 
             'bowl_wickets', 'bowl_economy', 'bowling_points_total', 'field_catch',
             'run_out_solo', 'wk_stumping', 'fielding_points_total', 'fantasy_points', 
             'total_points_all', 'base_points', 'boost_points'].includes(key)) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }

        // Simple comparison
        if (newDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
      
      // Get the original events in sorted order
      const sortedEvents = sortedMappedData.map(item => playerEvents[item.originalIndex]);
      setPlayerEvents(sortedEvents);
      return { key, direction: newDirection };
    });
  };

  return (
    <div className="container mx-auto px-2 py-4 max-w-7xl">
      {/* Match page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {matchOverview ? 
            `${matchOverview.team_1?.name} vs ${matchOverview.team_2?.name}` : 
            'Match Details'}
        </h1>
        {leagueName && (
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            League: {leagueName}
          </p>
        )}
      </div>

      {/* Overview cards section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <MatchOverview matchData={matchOverview} />
        </div>
        
        {leagueId && (
          <div>
            <SquadPerformance 
              matchId={matchId}
              leagueId={leagueId}
              activeSquadId={activeSquadId}
            />
          </div>
        )}
      </div>
      
      {/* Match Performance Container */}
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg">
        <MatchPerformanceContainer 
          playerEvents={playerEvents}
          loading={loading}
          error={error}
          sortConfig={sortConfig}
          handleSort={handleSort}
          activeSquadId={activeSquadId}
          leagueId={leagueId}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};

export default MatchView;