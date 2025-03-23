import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';
import MatchOverview from './cards/MatchOverview';
import MatchPerformanceContainer from './cards/MatchPerformanceContainer';
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
    }
  }, [matchId, leagueId]);

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
      setPlayerEvents(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch match data');
      console.error('Error fetching match data:', err);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-1 px-2 py-2">
      <MatchOverview matchData={matchOverview} />
      
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
  );
};

export default MatchView;