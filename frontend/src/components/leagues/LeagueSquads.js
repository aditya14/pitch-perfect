import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/axios';
import { Users, Shield, Zap, Trophy, Globe, Flame, Crown, Swords, Anchor, Handshake, Bomb, EarthLock, Sparkles, ChevronLeft, ChevronRight, ArrowUpDown, ShieldHalf, Volleyball } from 'lucide-react';
import LoadingScreen from '../elements/LoadingScreen';

// Helper function to get role icon
const getRoleIcon = (roleName, size = 16, squadColor) => {
  switch(roleName) {
    case 'Captain':
      return <Crown size={size} style={{color: squadColor}} />;
    case 'Vice-Captain':
      return <Swords size={size} style={{color: squadColor}} />;
    case 'Slogger':
      return <Zap size={size} style={{color: squadColor}} />;
    case 'Accumulator':
      return <Anchor size={size} style={{color: squadColor}} />;
    case 'Safe Hands':
      return <Handshake size={size} style={{color: squadColor}} />;
    case 'Rattler':
      return <Bomb size={size} style={{color: squadColor}} />;
    case 'Constrictor':
      return <EarthLock size={size} style={{color: squadColor}} />;
    default: // Virtuoso
      return <Sparkles size={size} style={{color: squadColor}} />;
  }
};

const LeagueSquads = ({ league }) => {
  const [squads, setSquads] = useState([]);
  const [playersData, setPlayersData] = useState([]);
  const [squadPlayers, setSquadPlayers] = useState({});
  const [draftData, setDraftData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('names'); // 'names', 'draft', 'roles', 'teams', 'boosts'
  const [playerDemandRanking, setPlayerDemandRanking] = useState([]);
  const [tooltip, setTooltip] = useState({ 
    visible: false, 
    playerId: null, 
    playerName: null, 
    avgRank: null,
    position: { x: 0, y: 0 } 
  });
  const [visibleColumns, setVisibleColumns] = useState({ start: 0, count: 3 }); // For mobile scrolling

  // Determine visible column count based on screen size
  useEffect(() => {
    const handleResize = () => {
      let count = 3; // Default for mobile
      if (window.innerWidth >= 1280) count = 10; // xl screens
      else if (window.innerWidth >= 1024) count = 5; // lg screens
      else if (window.innerWidth >= 768) count = 4; // md screens
      setVisibleColumns({ start: 0, count });
    };

    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchSquadsData = async () => {
      if (!league?.id) return;
      
      try {
        setLoading(true);
        
        // Fetch all league squads data using the new endpoint
        const squadsResponse = await api.get(`/leagues/${league.id}/squads/`);
        const { squads: squadsData, avg_draft_ranks } = squadsResponse.data;
        
        // Sort squads by snake_draft_order if available
        let sortedSquads = [...squadsData];
        if (league.snake_draft_order && league.snake_draft_order.length > 0) {
          // Create a map for faster lookups
          const squadsMap = {};
          squadsData.forEach(squad => {
            squadsMap[squad.id] = squad;
          });
          
          // Order squads based on snake_draft_order
          sortedSquads = [];
          league.snake_draft_order.forEach(squadId => {
            if (squadsMap[squadId]) {
              sortedSquads.push(squadsMap[squadId]);
              delete squadsMap[squadId]; // Remove to avoid duplicates
            }
          });
          
          // Add any remaining squads not in snake_draft_order
          Object.values(squadsMap).forEach(squad => {
            sortedSquads.push(squad);
          });
        }
        
        setSquads(sortedSquads);
        
        // Fetch all players data (for reference)
        const playersResponse = await api.get(`/leagues/${league.id}/players/`);
        const allPlayers = playersResponse.data;
        setPlayersData(allPlayers);
        
        // Process squad players data from the response
        const squadPlayersData = {};
        sortedSquads.forEach(squad => {
          squadPlayersData[squad.id] = squad.players;
        });
        setSquadPlayers(squadPlayersData);
        
        // Process draft data
        const draftInfo = {
          user_rankings: sortedSquads.reduce((acc, squad) => {
            if (squad.draft_ranking && squad.draft_ranking.length > 0) {
              acc[squad.id] = squad.draft_ranking;
            }
            return acc;
          }, {})
        };
        setDraftData(draftInfo);
        
        // Convert average draft ranks to our sorted array format
        const avgRankings = Object.entries(avg_draft_ranks).map(([playerId, avgRank]) => ({
          playerId: parseInt(playerId),
          avgRank: avgRank,
          totalRankings: sortedSquads.length
        }));
        
        // Sort by ascending average rank (lower is better/more in demand)
        avgRankings.sort((a, b) => a.avgRank - b.avgRank);
        setPlayerDemandRanking(avgRankings);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching squads data:', err);
        setError('Failed to load squads data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchSquadsData();
  }, [league]);
  
  // Group players by role
  const playersByRole = useMemo(() => {
    const result = {};
    
    Object.entries(squadPlayers).forEach(([squadId, players]) => {
      // Filter only current players
      const currentPlayers = players.filter(p => p.status === 'current');
      
      result[squadId] = {
        BAT: currentPlayers.filter(p => p.role === 'BAT'),
        BOWL: currentPlayers.filter(p => p.role === 'BOWL'),
        ALL: currentPlayers.filter(p => p.role === 'ALL'),
        WK: currentPlayers.filter(p => p.role === 'WK')
      };
    });
    
    return result;
  }, [squadPlayers]);
  
  // Group players by IPL team
  const playersByTeam = useMemo(() => {
    const result = {};
    
    Object.entries(squadPlayers).forEach(([squadId, players]) => {
      result[squadId] = {};
      
      // Group only current players by their IPL team
      players
        .filter(player => player.status === 'current') // Add this filter
        .forEach(player => {
          const teamCode = player.team_code || 'Unknown';
          if (!result[squadId][teamCode]) {
            result[squadId][teamCode] = [];
          }
          result[squadId][teamCode].push(player);
        });
    });
    
    return result;
  }, [squadPlayers]);
  
  // Helper function to get player average rank
  const getPlayerAvgRank = (playerId) => {
    const playerRanking = playerDemandRanking.find(item => item.playerId === parseInt(playerId));
    return playerRanking ? playerRanking.avgRank.toFixed(2) : 'N/A';
  };
  
  // Find player in demand rankings with improved styling
  const getPlayerDemandInfo = (playerId) => {
    const playerRank = playerDemandRanking.findIndex(item => item.playerId === parseInt(playerId));
    let demandClass = '';
    let isHotPick = false; // Flag for showing tooltip
    
    if (playerRank >= 0 && playerRank < 5) {
      // Top 5 most in demand - on fire!
      demandClass = 'bg-gradient-to-r from-red-500 to-yellow-500 text-white font-bold';
      isHotPick = true;
    } else if (playerRank >= 5 && playerRank < 15) {
      // Next 10 most in demand - subtle glow effect
      demandClass = 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-800 dark:to-yellow-900 border border-amber-300 dark:border-amber-700';
      isHotPick = true;
    }
    
    return { 
      rank: playerRank + 1, 
      demandClass, 
      avgRank: getPlayerAvgRank(playerId),
      isHotPick,
      playerRank // Include the actual rank value
    };
  };
  
  // Helper function to show tooltip
  const showTooltip = (playerId, playerName, avgRank, isHotPick, event) => {
    if (!isHotPick || !event) return;
    
    const tableContainer = event.currentTarget.closest('.overflow-x-auto');
    const rect = tableContainer.getBoundingClientRect();
    
    setTooltip({
      visible: true,
      playerId: parseInt(playerId),
      playerName,
      avgRank,
      position: {
        x: event.clientX,
        y: event.clientY - rect.top + tableContainer.scrollTop
      }
    });
  };
  
  // Helper function to hide tooltip
  const hideTooltip = () => {
    setTooltip({ visible: false, playerId: null, playerName: null, avgRank: null });
  };

  // Pagination controls for mobile view
  const nextPage = () => {
    if (visibleColumns.start + visibleColumns.count < squads.length) {
      setVisibleColumns(prev => ({
        ...prev,
        start: prev.start + 1
      }));
    }
  };

  const prevPage = () => {
    if (visibleColumns.start > 0) {
      setVisibleColumns(prev => ({
        ...prev,
        start: prev.start - 1
      }));
    }
  };

  // Get visible squads for current view
  const visibleSquads = useMemo(() => {
    return squads.slice(
      visibleColumns.start,
      visibleColumns.start + visibleColumns.count
    );
  }, [squads, visibleColumns]);

  if (loading) {
    return <LoadingScreen message="Loading Squads" description="Getting all squad information" />;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  // Calculate progress indicators for pagination
  const showPagination = squads.length > visibleColumns.count;
  const canGoNext = visibleColumns.start + visibleColumns.count < squads.length;
  const canGoPrev = visibleColumns.start > 0;

  return (
    <div className="space-y-4">
      {/* View Selection Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveView('names')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            activeView === 'names'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <Users className="h-3 w-3 mr-1" />
          All Players
        </button>
        
        <button
          onClick={() => setActiveView('draft')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            activeView === 'draft'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <ArrowUpDown className="h-3 w-3 mr-1" />
          Draft Order
        </button>
        
        <button
          onClick={() => setActiveView('roles')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            activeView === 'roles'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <Volleyball className="h-3 w-3 mr-1" />
          By Role
        </button>
        
        <button
          onClick={() => setActiveView('teams')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            activeView === 'teams'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <ShieldHalf className="h-3 w-3 mr-1" />
          By IPL Team
        </button>
        
        <button
          onClick={() => setActiveView('boosts')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            activeView === 'boosts'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <Zap className="h-3 w-3 mr-1" />
          Boosts
        </button>
      </div>

      {/* Mobile Pagination Controls */}
      {showPagination && (
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={prevPage} 
            disabled={!canGoPrev}
            className={`p-1 rounded-md ${!canGoPrev ? 'text-neutral-400 cursor-not-allowed' : 'text-neutral-700 dark:text-neutral-300'}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            {visibleColumns.start + 1}-{Math.min(visibleColumns.start + visibleColumns.count, squads.length)} of {squads.length} squads
          </div>
          
          <button 
            onClick={nextPage} 
            disabled={!canGoNext}
            className={`p-1 rounded-md ${!canGoNext ? 'text-neutral-400 cursor-not-allowed' : 'text-neutral-700 dark:text-neutral-300'}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Squad Table - More compact and spreadsheet-like */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-700">
              {/* Squad columns - No first column in 'names' view */}
              {activeView !== 'names' && (
                <th className="sticky left-0 bg-neutral-50 dark:bg-neutral-700 z-10 px-2 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
                  {activeView === 'teams' ? 'IPL Team' : (activeView === 'draft' ? 'Rank' : activeView === 'roles' ? 'Role' : 'Boost')}
                </th>
              )}
              
              {visibleSquads.map(squad => (
                <th 
                  key={squad.id}
                  className="px-2 py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600"
                  style={{ minWidth: '120px' }}
                >
                  <Link 
                    to={`/squads/${squad.id}`}
                    className="flex flex-col items-center"
                  >
                    <span 
                      className="inline-block h-2 w-12 mb-1 rounded-sm" 
                      style={{ backgroundColor: squad.color }}
                    ></span>
                    <span className="truncate max-w-[110px]">{squad.name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* NAMES VIEW */}
            {activeView === 'names' && (
              <>
                {/* Create a single row with multiple cells, one per squad */}
                <tr>
                  {visibleSquads.map(squad => (
                    <td key={squad.id} className="p-0 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400 align-top border border-neutral-200 dark:border-neutral-600">
                      {squadPlayers[squad.id]
                        ?.filter(player => player.status === 'current') // Only show current players
                        .map(player => {
                          const { demandClass, avgRank, isHotPick, playerRank } = getPlayerDemandInfo(player.id);
                          return (
                            <div 
                              key={player.id} 
                              className={`px-1 py-1 truncate ${demandClass} border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700`}
                              title={isHotPick ? `Avg. Rank: ${avgRank}` : ""}
                            >
                              {playerRank <= 4 && <Flame className="h-2 w-2 inline-block mr-1 text-white" />}
                              {player.name}
                            </div>
                          );
                        })}
                    </td>
                  ))}
                </tr>
              </>
            )}
            
            {/* DRAFT ORDER VIEW */}
            {activeView === 'draft' && (
              (() => {
                // Get ordered squads based on snake_draft_order
                let orderedSquads = [...visibleSquads];
                
                if (league && league.snake_draft_order && league.snake_draft_order.length > 0) {
                  // Create a map for faster lookups
                  const squadsMap = {};
                  visibleSquads.forEach(squad => {
                    squadsMap[squad.id] = squad;
                  });
                  
                  // Order squads according to snake_draft_order
                  orderedSquads = [];
                  league.snake_draft_order.forEach(squadId => {
                    const squad = squadsMap[squadId];
                    if (squad) {
                      orderedSquads.push(squad);
                    }
                  });
                  
                  // Add any squads not in the draft order
                  visibleSquads.forEach(squad => {
                    if (!league.snake_draft_order.includes(squad.id)) {
                      orderedSquads.push(squad);
                    }
                  });
                }
                
                // Get max length of draft rankings
                const maxRankings = Math.max(...orderedSquads.map(s => (s.draft_ranking || []).length), 0);
                
                const displayRankings = maxRankings
                
                return Array.from({ length: displayRankings }).map((_, rankIndex) => (
                  <tr key={`rank-${rankIndex}`} className={rankIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : ''}>
                    {/* Player rank as the first cell in each row */}
                    <td className="sticky left-0 bg-white dark:bg-neutral-800 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600">
                      {rankIndex + 1}
                    </td>
                    
                    {/* For each squad in draft order, show the player at this rank */}
                    {orderedSquads.map(squad => {
                      // Get the player ID at this rank
                      const playerId = squad.draft_ranking?.[rankIndex];
                      if (!playerId) return (
                        <td key={`${squad.id}-rank-${rankIndex}`} className="px-2 py-1 whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-600">
                          -
                        </td>
                      );
                      
                      // Find player in playersData
                      const playerIdInt = typeof playerId === 'string' ? parseInt(playerId) : playerId;
                      const player = playersData.find(p => p.id === playerIdInt);
                      
                      // Check if player is in this squad
                      const isInSquad = squad.players?.some(p => p.id === playerIdInt && p.status === 'current');
                      
                      return (
                        <td 
                          key={`${squad.id}-rank-${rankIndex}`} 
                          className={`px-2 py-1 whitespace-nowrap text-xs truncate border border-neutral-200 dark:border-neutral-600 ${
                            isInSquad ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300' : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {player ? player.name : `ID: ${playerId}`}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()
            )}
            
            {/* ROLES VIEW */}
            {activeView === 'roles' && (
              Object.entries({
                BAT: 'BAT',
                BOWL: 'BOWL',
                ALL: 'ALL',
                WK: 'WK'
              }).map(([role, label], roleIndex) => (
                <tr key={role} className={roleIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : ''}>
                  <td className="sticky left-0 bg-white dark:bg-neutral-800 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600">
                    {label}
                  </td>
                  
                  {visibleSquads.map(squad => (
                    <td key={`${squad.id}-${role}`} className="p-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">
                      {playersByRole[squad.id]?.[role]
                        ?.filter(player => player.status === 'current') // Add this filter
                        ?.map(player => {
                          const { demandClass, avgRank, isHotPick } = getPlayerDemandInfo(player.id);
                          return (
                            <div 
                              key={player.id} 
                              className={`px-1 py-0.5 truncate ${demandClass} hover:bg-neutral-50 dark:hover:bg-neutral-700 relative`}
                              onMouseEnter={() => showTooltip(player.id, player.name, avgRank, isHotPick)}
                              onMouseLeave={hideTooltip}
                            >
                              {player.name}
                            </div>
                          );
                        })}
                    </td>
                  ))}
                </tr>
              ))
            )}
            
            {/* TEAMS VIEW */}
            {activeView === 'teams' && (
              // Get unique list of all IPL teams represented
              [...new Set(
                Object.values(playersByTeam)
                  .flatMap(teamMap => Object.keys(teamMap))
              )].sort().map((teamCode, teamIndex) => (
                <tr key={teamCode} className={teamIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : ''}>
                  <td className="sticky left-0 bg-white dark:bg-neutral-800 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600">
                    {teamCode}
                  </td>
                  
                  {visibleSquads.map(squad => (
                    <td key={`${squad.id}-${teamCode}`} className="p-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">
                      {playersByTeam[squad.id]?.[teamCode]
                        ?.filter(player => player.status === 'current') // Add this filter
                        ?.map(player => {
                          const { demandClass, avgRank, isHotPick } = getPlayerDemandInfo(player.id);
                          return (
                            <div 
                              key={player.id} 
                              className={`px-1 py-0.5 truncate ${demandClass} hover:bg-neutral-50 dark:hover:bg-neutral-700 relative`}
                              onMouseEnter={() => showTooltip(player.id, player.name, avgRank, isHotPick)}
                              onMouseLeave={hideTooltip}
                            >
                              {player.name}
                            </div>
                          );
                        })}
                    </td>
                  ))}
                </tr>
              ))
            )}
            
            {/* BOOSTS VIEW */}
            {activeView === 'boosts' && (
              squads.length > 0 && (
                Object.entries({
                  captain: 'Captain',
                  vice_captain: 'Vice-Captain',
                  slogger: 'Slogger',
                  accumulator: 'Accumulator', 
                  safe_hands: 'Safe Hands',
                  virtuoso: 'Virtuoso',
                  rattler: 'Rattler',
                  constrictor: 'Constrictor',
                }).map(([roleKey, roleLabel], roleIndex) => (
                  <tr key={roleKey} className={roleIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : ''}>
                    <td className="sticky left-0 bg-white dark:bg-neutral-800 z-10 px-2 py-1 whitespace-nowrap font-medium text-xs text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600">
                      <div className="flex items-center gap-1">
                        {getRoleIcon(roleLabel, 14)}
                        <span className="truncate">{roleLabel}</span>
                      </div>
                    </td>
                    
                    {visibleSquads.map(squad => {
                      // Find the player ID from the core squad
                      const coreSquad = squad.current_core_squad || {};
                      
                      // Support both object format with boost IDs and legacy format with role keys
                      let boostPlayerId = null;
                      
                      // Check if the core squad is an array of {boost_id, player_id} objects
                      if (Array.isArray(coreSquad)) {
                        // Find the boost object that matches the role (need to map role key to boost ID)
                        const roleKeyToId = {
                          'captain': 1,
                          'vice_captain': 2,
                          'slogger': 3,
                          'accumulator': 4,
                          'safe_hands': 5,
                          'rattler': 6,
                          'constrictor': 7,
                          'virtuoso': 8
                        };
                        
                        const boostObj = coreSquad.find(b => b.boost_id === roleKeyToId[roleKey]);
                        boostPlayerId = boostObj ? boostObj.player_id : null;
                      } else {
                        // Legacy format - direct mapping from role key to player ID
                        boostPlayerId = coreSquad[roleKey];
                      }
                      
                      // Find the player in the squad's player list
                      const boostPlayer = boostPlayerId && squadPlayers[squad.id] 
                        ? squadPlayers[squad.id].find(p => p.id === boostPlayerId)
                        : null;
                      
                      // Get demand info if player exists
                      const { demandClass, avgRank, isHotPick } = boostPlayerId && boostPlayer
                        ? getPlayerDemandInfo(boostPlayerId) 
                        : { demandClass: '', avgRank: 'N/A', isHotPick: false };
                      
                      return (
                        <td key={`${squad.id}-${roleKey}`} className="p-0 whitespace-nowrap text-xs border border-neutral-200 dark:border-neutral-600">
                          {boostPlayer ? (
                            <div 
                              className={`w-full h-full px-2 py-1 truncate ${demandClass} relative`} 
                              onMouseEnter={() => showTooltip(boostPlayerId, boostPlayer.name, avgRank, isHotPick)}
                              onMouseLeave={hideTooltip}
                            >
                              {boostPlayer.name}
                            </div>
                          ) : (
                            <span className="px-2 py-1 block text-neutral-400 dark:text-neutral-500">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
      
      {/* Fixed Tooltip that shows when hovering over top-ranked players */}
      {tooltip.visible && (
        <div 
            className="absolute z-50 px-3 py-2 bg-neutral-800 text-white text-xs rounded-md shadow-lg"
            style={{ 
            left: tooltip.position.x + 15,
            top: tooltip.position.y - 30,
            pointerEvents: 'none'
            }}
        >
            Avg. Rank: {tooltip.avgRank}
        </div>
        )}
      
      {/* Legend for player demand */}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs mt-2">
        <div className="flex items-center">
          <div className="h-4 w-4 bg-gradient-to-r from-red-500 to-yellow-500 rounded flex items-center justify-center mr-1">
            <Flame className="h-2 w-2 text-white" />
          </div>
          <span className="text-neutral-600 dark:text-neutral-300">Top 5 in demand</span>
        </div>
        <div className="flex items-center">
          <div className="h-4 w-4 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-800 dark:to-yellow-900 border border-amber-300 dark:border-amber-700 rounded mr-1"></div>
          <span className="text-neutral-600 dark:text-neutral-300">Top 6-15 in demand</span>
        </div>
      </div>
    </div>
  );
};

export default LeagueSquads;