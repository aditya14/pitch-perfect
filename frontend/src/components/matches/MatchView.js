import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpDown, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../utils/axios';
import TeamBadge from '../elements/TeamBadge';
import { usePlayerModal } from '../../context/PlayerModalContext';

// Helper function to safely convert to lowercase
const safeToLowerCase = (str) => {
  return str && typeof str === 'string' ? str.toLowerCase() : '';
};

// Helper function to determine text color based on background color
const getContrastColor = (hexColor) => {
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Calculate luminance - simplified formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Use white text for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const MatchOverview = ({ matchData }) => {
  if (!matchData) return null;

  const getReadableDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getWinDescription = () => {
    if (!matchData.winner) return null;
    const margin = matchData.win_margin;
    const type = matchData.win_type;
    return type === 'WICKETS' ? 
      `${matchData.winner.name} won by ${margin} wicket${margin > 1 ? 's' : ''}` :
      `${matchData.winner.name} won by ${margin} run${margin > 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-2">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Match Overview
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Match #{matchData.match_number} • {matchData.stage}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Teams and Score */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex-1 text-center md:text-right">
            <TeamBadge team={matchData.team_1} className="mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {matchData.inns_1_runs}/{matchData.inns_1_wickets}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ({matchData.inns_1_overs} overs)
            </div>
          </div>
          
          <div className="text-gray-400 dark:text-gray-500 text-lg font-medium px-4">
            vs
          </div>

          <div className="flex-1 text-center md:text-left">
            <TeamBadge team={matchData.team_2} className="mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {matchData.inns_2_runs}/{matchData.inns_2_wickets}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ({matchData.inns_2_overs} overs)
            </div>
          </div>
        </div>

        {/* Match Details Table */}
        <div className="w-full max-w-3xl">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr className="group">
                <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Date</td>
                <td className="py-3 text-gray-900 dark:text-white">{getReadableDate(matchData.date)}</td>
              </tr>
              <tr className="group">
                <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Venue</td>
                <td className="py-3 text-gray-900 dark:text-white">{matchData.venue}</td>
              </tr>
              <tr className="group">
                <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Toss</td>
                <td className="py-3 text-gray-900 dark:text-white">
                  <TeamBadge team={matchData.toss_winner} useShortName={true} className="mr-1" /> chose to {safeToLowerCase(matchData.toss_decision)}
                </td>
              </tr>
              {matchData.status === 'COMPLETED' && (
                <>
                  <tr className="group">
                    <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Result</td>
                    <td className="py-3 text-gray-900 dark:text-white flex items-center gap-2">
                      <TeamBadge team={matchData.winner} useShortName={true} /> 
                      <span>won by {matchData.win_margin} {safeToLowerCase(matchData.win_type)}</span>
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    </td>
                  </tr>
                  {matchData.player_of_match && (
                    <tr className="group">
                      <td className="py-3 w-32 text-gray-500 dark:text-gray-400 font-medium">Player of Match</td>
                      <td className="py-3 text-gray-900 dark:text-white">{matchData.player_of_match.name}</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MatchView = () => {
  const { matchId, leagueId } = useParams();
  const [playerEvents, setPlayerEvents] = useState([]);
  const [matchOverview, setMatchOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'total_points_all', direction: 'desc' });
  const [activeSquadId, setActiveSquadId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const { openPlayerModal } = usePlayerModal();
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

  const toggleRowExpand = (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const handleSort = (key) => {
    setSortConfig((currentConfig) => {
      const newDirection = 
        currentConfig.key === key && currentConfig.direction === 'desc'
          ? 'asc'
          : 'desc';

      // Map the data to a simpler structure first to avoid nested property issues
      const mappedData = playerEvents.map((event, index) => ({
        originalEvent: event, // Keep reference to original event
        originalIndex: index, // Keep track of original position
        ...getEventData(event) // Use your existing transformation function
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

  const SortableHeader = ({ label, sortKey }) => (
    <div
      onClick={() => handleSort(sortKey)}
      className="cursor-pointer group flex items-center text-left"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

  const getEventData = (event) => {
    if (event.base_stats) {
      // This is a fantasy event with base_stats
      const basePoints = event.base_stats.total_points_all || 0;
      const boostPoints = event.boost_points || 0;
      
      return {
        ...event.base_stats,
        base_points: basePoints,
        boost_points: boostPoints,
        fantasy_points: basePoints + boostPoints,  // Total fantasy points = base + boost
        squad_name: event.squad_name,
        squad_id: event.squad_id,
        team_name: event.team_name,
        team_color: event.team_color,
        player_name: event.player_name,
        squad_color: event.squad_color,
        boost_label: event.boost_label,
        player_id: event.player_id,
        match_id: event.match_id,
        id: event.id
      };
    }
    // This is a regular IPL player event
    return {
      ...event,
      base_points: event.total_points_all || 0,
      boost_points: 0,
      fantasy_points: event.total_points_all || 0,
      player_id: event.player_id,
      match_id: event.match_id
    };
  };

  // Function to get the color class based on points value
  const getPointsColorClass = (points) => {
    if (points >= 60) return 'text-green-600 dark:text-green-400';
    if (points >= 35) return 'text-blue-600 dark:text-blue-400';
    if (points < 10) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const hasFantasyData = playerEvents.some(event => event.fantasy_points || event.squad_name);

  return (
    <div className="space-y-1 px-2 py-2">
      <MatchOverview matchData={matchOverview} />
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Match Performance
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[calc(100vh-12rem)]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20">
              {/* Main header groups - Desktop view */}
              {!isMobile && (
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                    Team
                  </th>
                  <th scope="col" className="sticky left-[84px] z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                    Player/Squad
                  </th>
                  
                  {hasFantasyData && leagueId ? (
                    <th scope="col" colSpan="3" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                      Points
                    </th>
                  ) : (
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                      Points
                    </th>
                  )}
                  
                  <th scope="col" colSpan="6" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                    Batting
                  </th>
                  <th scope="col" colSpan="6" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                    Bowling
                  </th>
                  <th scope="col" colSpan="4" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                    Fielding
                  </th>
                </tr>
              )}
              
              {/* Mobile view simplified header - smaller with less space */}
              {isMobile && (
                <tr>
                  <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                    <SortableHeader label="Team" sortKey="team_name" />
                  </th>
                  <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                    <SortableHeader label="Player" sortKey="squad_name" />
                  </th>
                  {hasFantasyData && leagueId ? (
                    <>
                      <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                        <SortableHeader label="Base" sortKey="base_points" />
                      </th>
                      <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                        <SortableHeader label="Bst" sortKey="boost_points" />
                      </th>
                      <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                        <SortableHeader label="Tot" sortKey="fantasy_points" />
                      </th>
                    </>
                  ) : (
                    <th scope="col" className="px-1 py-1 text-left text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                      <SortableHeader label="Total" sortKey="total_points_all" />
                    </th>
                  )}
                  <th scope="col" className="w-8"></th>
                </tr>
              )}
              
              {/* Sub-headers - Desktop view */}
              {!isMobile && (
                <tr className="bg-gray-50 dark:bg-gray-700">
                  {/* Team column */}
                  <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-20">
                    <SortableHeader label="Team" sortKey="team_name" />
                  </th>
                  
                  {/* Player/Squad column */}
                  <th scope="col" className="sticky left-[84px] z-10 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-32">
                    <div className="flex flex-col">
                      <SortableHeader label="Player" sortKey="player_name" />
                      <SortableHeader label="Squad" sortKey="squad_name" />
                    </div>
                  </th>
                  
                  {/* Points columns - different based on fantasy/non-fantasy */}
                  {hasFantasyData && leagueId ? (
                    <>
                      <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-16 border-l dark:border-gray-600">
                        <SortableHeader label="Base" sortKey="base_points" />
                      </th>
                      <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-16">
                        <SortableHeader label="Boost" sortKey="boost_points" />
                      </th>
                      <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider font-bold w-16">
                        <SortableHeader label="Total" sortKey="fantasy_points" />
                      </th>
                    </>
                  ) : (
                    <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-16 border-l dark:border-gray-600">
                      <SortableHeader label="Total" sortKey="total_points_all" />
                    </th>
                  )}
                  
                  {/* Batting subheaders */}
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12 border-l dark:border-gray-600">
                    <SortableHeader label="R" sortKey="bat_runs" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="B" sortKey="bat_balls" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="4s" sortKey="bat_fours" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="6s" sortKey="bat_sixes" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="SR" sortKey="bat_strike_rate" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="Pts" sortKey="batting_points_total" />
                  </th>
                  
                  {/* Bowling subheaders */}
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12 border-l dark:border-gray-600">
                    <SortableHeader label="O" sortKey="bowl_balls" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="M" sortKey="bowl_maidens" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="R" sortKey="bowl_runs" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="W" sortKey="bowl_wickets" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="Econ" sortKey="bowl_economy" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="Pts" sortKey="bowling_points_total" />
                  </th>
                  
                  {/* Fielding subheaders */}
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12 border-l dark:border-gray-600">
                    <SortableHeader label="Ct" sortKey="field_catch" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="RO" sortKey="run_out_solo" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="St" sortKey="wk_stumping" />
                  </th>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider w-12">
                    <SortableHeader label="Pts" sortKey="fielding_points_total" />
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {playerEvents.map((event, index) => {
                const data = getEventData(event);
                const isActiveSquadPlayer = activeSquadId && data.squad_id === activeSquadId;
                const rowId = `row-${data.id || data.player_id || index}`;
                const isExpanded = expandedRows[rowId] || false;
                console.log('data:', data);
                
                // Desktop view - full row
                if (!isMobile) {
                  return (
                    <tr 
                      key={rowId} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                    >
                      {/* Team info */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white font-medium"
                          style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                      >
                        {data.team_name}
                      </td>
                      
                      {/* Player/Squad info */}
                      <td className="sticky left-[84px] z-10 bg-white dark:bg-gray-800 px-2 py-2 whitespace-nowrap"
                          style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                      >
                        <div 
                          className="text-xs text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                          onClick={() => openPlayerModal(data.player_id, leagueId)}
                        >
                          {data.player_name} {data.player_of_match && '🏅'}
                        </div>
                        {data.squad_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <div 
                              className="h-3 w-1 mr-1 rounded-sm"
                              style={{ backgroundColor: data.squad_color }}
                            />
                            <span>{data.squad_name}</span>
                            
                            {data.boost_label && (
                              <span 
                                className="ml-1 px-1 text-xs rounded"
                                style={{
                                  backgroundColor: data.squad_color,
                                  color: getContrastColor(data.squad_color),
                                  fontSize: '0.65rem'
                                }}
                              >
                                {data.boost_label}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      
                      {/* Points columns - different based on fantasy/non-fantasy */}
                      {hasFantasyData && leagueId ? (
                        <>
                          <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white border-l dark:border-gray-600">
                            <span className={getPointsColorClass(data.base_points)}>
                              {data.base_points}
                            </span>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                            {data.boost_points > 0 ? data.boost_points : '-'}
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-xs text-left font-bold text-gray-900 dark:text-white">
                            {data.fantasy_points}
                          </td>
                        </>
                      ) : (
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left border-l dark:border-gray-600">
                          <span className={`font-bold ${getPointsColorClass(data.total_points_all)}`}>
                            {data.total_points_all}
                          </span>
                        </td>
                      )}
                      
                      {/* Batting stats */}
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white border-l dark:border-gray-600
                        ${data.bat_runs ? 'font-medium' : 'opacity-30'}
                      `}>
                        {data.bat_runs ? data.bat_runs : '-'}
                      </td>
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                        ${!data.bat_balls && 'opacity-30'}
                      `}>
                        {data.bat_balls ? data.bat_balls : '-'}
                      </td>
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                        ${!data.bat_fours && 'opacity-30'}
                      `}>
                        {data.bat_fours ? data.bat_fours : '-'}
                      </td>
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                        ${!data.bat_sixes && 'opacity-30'}
                      `}>
                        {data.bat_sixes ? data.bat_sixes : '-'}
                      </td>
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                        ${!data.bat_strike_rate && 'opacity-30'}
                      `}>
                        {data.bat_strike_rate ? data.bat_strike_rate?.toFixed(2) : '-'}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                        {data.batting_points_total || '-'}
                      </td>
                      
                      {/* Bowling stats */}
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight border-l dark:border-gray-600
                        ${!data.bowl_balls && 'opacity-30'}
                      `}>
                        {data.bowl_balls ? 
                          `${Math.floor(data.bowl_balls / 6)}${data.bowl_balls % 6 ? '.' + (data.bowl_balls % 6) : ''}` 
                          : '-'
                        }
                      </td>
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                        ${(!data.bowl_maidens && !data.bowl_balls) && 'opacity-30'}
                      `}>
                        {data.bowl_maidens ? data.bowl_maidens : data.bowl_balls ? 0 : '-'}
                      </td>
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white font-extralight
                        ${!data.bowl_runs && 'opacity-30'}
                      `}>
                        {data.bowl_runs ? data.bowl_runs : '-'}
                      </td>
                      <td className={`
                        px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white
                        ${data.bowl_wickets ? 'font-medium' : data.bowl_balls ? '' : 'opacity-30'}
                      `}>
                        {data.bowl_wickets ? data.bowl_wickets : data.bowl_balls ? 0 : '-'}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                        {data.bowl_economy ? data.bowl_economy?.toFixed(2) : '-'}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                        {data.bowling_points_total || '-'}
                      </td>
                      
                      {/* Fielding stats */}
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white border-l dark:border-gray-600">
                        {(data.field_catch || 0) + (data.wk_catch || 0) || '-'}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                        {(data.run_out_solo || 0) + (data.run_out_collab || 0) || '-'}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                        {data.wk_stumping || '-'}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap text-xs text-left text-gray-900 dark:text-white">
                        {data.fielding_points_total || '-'}
                      </td>
                    </tr>
                  );
                }
                
                // Mobile view - collapsed/expanded rows
                return (
                  <React.Fragment key={rowId}>
                    {/* Main row - always visible */}
                    <tr 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}33` } : {}}
                    >
                      <td className="px-1 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">
                        {data.team_name}
                      </td>
                      <td className="px-1 py-2 whitespace-nowrap">
                        <div 
                          className="text-xs text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                          onClick={() => openPlayerModal(data.player_id, leagueId)}
                        >
                          {data.player_name} {data.player_of_match && '🏅'}
                        </div>
                        {data.squad_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <div 
                                className="w-1 h-3 mr-1 rounded-sm"
                                style={{ backgroundColor: data.squad_color }}
                              />
                              <span>{data.squad_name}</span>
                            </div>
                            {data.boost_label && (
                              <div className="mt-1">
                                <span 
                                  className="px-1 text-xs rounded"
                                  style={{
                                    backgroundColor: data.squad_color,
                                    color: getContrastColor(data.squad_color),
                                    fontSize: '0.65rem'
                                  }}
                                >
                                  {data.boost_label}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      
                      {/* Points columns - different based on fantasy/non-fantasy */}
                      {hasFantasyData && leagueId ? (
                        <>
                          <td className="px-1 py-2 whitespace-nowrap text-xs text-left">
                            <span className={getPointsColorClass(data.base_points)}>
                              {data.base_points}
                            </span>
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-xs text-left">
                            {data.boost_points > 0 ? data.boost_points : '-'}
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap text-xs text-left font-bold">
                            {data.fantasy_points}
                          </td>
                        </>
                      ) : (
                        <td className="px-1 py-2 whitespace-nowrap text-xs text-left">
                          <span className={`font-bold ${getPointsColorClass(data.total_points_all)}`}>
                            {data.total_points_all}
                          </span>
                        </td>
                      )}
                      
                      {/* Smaller expand/collapse button */}
                      <td className="px-0 py-2 text-center">
                        <button 
                          onClick={() => toggleRowExpand(rowId)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                        >
                          {isExpanded ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded details - only visible when expanded */}
                    {isExpanded && (
                      <tr 
                        className="bg-gray-50 dark:bg-gray-700" 
                        style={isActiveSquadPlayer ? { backgroundColor: `${data.squad_color}22` } : {}}
                      >
                        <td colSpan={hasFantasyData && leagueId ? 6 : 4} className="px-4 py-2">
                          <div className="grid grid-cols-1 gap-2">
                            {/* Batting stats */}
                            {data.bat_runs > 0 && (
                              <div className="border-b border-gray-200 dark:border-gray-600 pb-2">
                                <div className="flex justify-between">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">BATTING</span>
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{data.batting_points_total} pts</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <div className="text-sm text-gray-800 dark:text-gray-200">
                                    <span className="font-medium">{data.bat_runs}({data.bat_balls})</span> 
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                      {data.bat_fours > 0 && `${data.bat_fours}×4`}{data.bat_fours > 0 && data.bat_sixes > 0 && ', '}
                                      {data.bat_sixes > 0 && `${data.bat_sixes}×6`}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    SR: {data.bat_strike_rate?.toFixed(2) || '-'}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Bowling stats */}
                            {data.bowl_balls > 0 && (
                              <div className="border-b border-gray-200 dark:border-gray-600 pb-2">
                                <div className="flex justify-between">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">BOWLING</span>
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{data.bowling_points_total} pts</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {data.bowl_wickets}/{data.bowl_runs} ({Math.floor(data.bowl_balls / 6)}.
                                    {data.bowl_balls % 6})
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Econ: {data.bowl_economy?.toFixed(2) || '-'}
                                    {data.bowl_maidens > 0 && `, ${data.bowl_maidens} maiden${data.bowl_maidens > 1 ? 's' : ''}`}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Fielding stats */}
                            {((data.field_catch > 0) || (data.wk_catch > 0) || (data.run_out_solo > 0) || 
                              (data.run_out_collab > 0) || (data.wk_stumping > 0)) && (
                              <div>
                                <div className="flex justify-between">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">FIELDING</span>
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{data.fielding_points_total} pts</span>
                                </div>
                                <div className="text-sm mt-1 text-gray-800 dark:text-gray-200">
                                  {data.field_catch > 0 && <span className="mr-2">{data.field_catch} catch{data.field_catch !== 1 && 'es'}</span>}
                                  {data.wk_catch > 0 && <span className="mr-2">{data.wk_catch} wk catch{data.wk_catch !== 1 && 'es'}</span>}
                                  {data.wk_stumping > 0 && <span className="mr-2">{data.wk_stumping} stumping{data.wk_stumping !== 1 && 's'}</span>}
                                  {data.run_out_solo > 0 && <span className="mr-2">{data.run_out_solo} run out{data.run_out_solo !== 1 && 's'}</span>}
                                  {data.run_out_collab > 0 && <span>{data.run_out_collab} assist{data.run_out_collab !== 1 && 's'}</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {playerEvents.length === 0 && (
                <tr>
                  <td 
                    colSpan={isMobile ? (hasFantasyData && leagueId ? 6 : 4) : (hasFantasyData && leagueId ? 20 : 18)} 
                    className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    No player data available for this match
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MatchView;