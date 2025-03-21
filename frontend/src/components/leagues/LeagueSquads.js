import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/axios';
import { Users, Shield, Zap, Trophy, Globe, Flame, Crown, Swords, Anchor, Handshake, Bomb, EarthLock, Sparkles } from 'lucide-react';
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
  const [tooltip, setTooltip] = useState({ visible: false, playerId: null });

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
        
        console.log("Original squad order:", squadsData.map(s => s.id));
        console.log("Snake draft order:", league.snake_draft_order);
        console.log("Sorted squad order:", sortedSquads.map(s => s.id));
        
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
      result[squadId] = {
        BAT: players.filter(p => p.role === 'BAT'),
        BOWL: players.filter(p => p.role === 'BOWL'),
        ALL: players.filter(p => p.role === 'ALL'),
        WK: players.filter(p => p.role === 'WK')
      };
    });
    
    return result;
  }, [squadPlayers]);
  
  // Group players by IPL team
  const playersByTeam = useMemo(() => {
    const result = {};
    
    Object.entries(squadPlayers).forEach(([squadId, players]) => {
      result[squadId] = {};
      
      // Group players by their IPL team
      players.forEach(player => {
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
      demandClass = 'px-1 bg-gradient-to-r from-red-500 to-yellow-500 text-white font-bold shadow-md animate-pulse relative border border-orange-400';
      isHotPick = true;
    } else if (playerRank >= 5 && playerRank < 15) {
      // Next 10 most in demand - subtle glow effect
      demandClass = 'px-1 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-800 dark:to-yellow-900 border border-amber-300 dark:border-amber-700 shadow-sm hover:shadow transition-all duration-200';
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
  const showTooltip = (playerId, event, isHotPick) => {
    if (!event || !isHotPick) return;
    
    setTooltip({
      visible: true,
      playerId,
      position: { x: event.clientX, y: event.clientY }
    });
  };
  
  // Helper function to hide tooltip
  const hideTooltip = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  // Check if a player was actually drafted to a squad
  const isPlayerInSquad = (squad, playerId) => {
    return squad.players.some(p => p.id === parseInt(playerId) && p.status === 'current');
  };

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

  return (
    <div className="space-y-6">
      {/* View Selection Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveView('names')}
          className={`flex items-center px-3 py-2 text-sm rounded-md ${
            activeView === 'names'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Users className="h-4 w-4 mr-2" />
          All Players
        </button>
        
        <button
          onClick={() => setActiveView('draft')}
          className={`flex items-center px-3 py-2 text-sm rounded-md ${
            activeView === 'draft'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Trophy className="h-4 w-4 mr-2" />
          Draft Order
        </button>
        
        <button
          onClick={() => setActiveView('roles')}
          className={`flex items-center px-3 py-2 text-sm rounded-md ${
            activeView === 'roles'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Shield className="h-4 w-4 mr-2" />
          By Role
        </button>
        
        <button
          onClick={() => setActiveView('teams')}
          className={`flex items-center px-3 py-2 text-sm rounded-md ${
            activeView === 'teams'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Globe className="h-4 w-4 mr-2" />
          By IPL Team
        </button>
        
        <button
          onClick={() => setActiveView('boosts')}
          className={`flex items-center px-3 py-2 text-sm rounded-md ${
            activeView === 'boosts'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Zap className="h-4 w-4 mr-2" />
          Boosts
        </button>
      </div>
      
      {/* Squad Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white dark:bg-gray-800 z-10 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {activeView === 'teams' ? 'IPL Team' : ''}
              </th>
              
              {/* Squad columns */}
              {squads.map(squad => (
                <th 
                  key={squad.id}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  style={{ minWidth: '200px' }}
                >
                  <Link 
                    to={`/squads/${squad.id}`}
                    className="flex flex-col items-start"
                  >
                    <span 
                      className="inline-block h-3 w-20 mb-1 rounded-md" 
                      style={{ backgroundColor: squad.color }}
                    ></span>
                    <span>{squad.name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* NAMES VIEW */}
            {activeView === 'names' && (
              <tr>
                <td className="sticky left-0 bg-white dark:bg-gray-800 z-10 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  
                </td>
                
                {squads.map(squad => (
                  <td key={squad.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 align-top">
                    <div className="space-y-1">
                    {squadPlayers[squad.id]?.map(player => {
                        const { demandClass, avgRank, isHotPick, playerRank } = getPlayerDemandInfo(player.id);
                        return (
                            <div 
                            key={player.id} 
                            className={`py-1 rounded relative ${demandClass}`}
                            onMouseEnter={(e) => showTooltip(player.id, e, isHotPick)}
                            onMouseLeave={hideTooltip}
                            >
                            {playerRank <= 4 && <Flame className="h-3 w-3 inline-block mr-1 text-white" />}
                            {player.name}
                            {tooltip.visible && tooltip.playerId === parseInt(player.id) && (
                                <div 
                                className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded z-50"
                                >
                                Avg. Rank: {avgRank}
                                </div>
                            )}
                            </div>
                        );
                        })}
                    </div>
                  </td>
                ))}
              </tr>
            )}
            
            {/* DRAFT ORDER VIEW */}
            {activeView === 'draft' && (
            <>
                {/* Get ordered squads based on snake_draft_order */}
                {(() => {
                // Create a new array of squads in draft order
                let orderedSquads = [...squads];
                
                console.log("Original snake_draft_order:", league.snake_draft_order);
                console.log("Original squads:", squads.map(s => s.id));
                
                if (league && league.snake_draft_order && league.snake_draft_order.length > 0) {
                    // Create a map for faster lookups
                    const squadsMap = {};
                    squads.forEach(squad => {
                    squadsMap[squad.id] = squad;
                    });
                    
                    // Order squads according to snake_draft_order exactly
                    orderedSquads = [];
                    league.snake_draft_order.forEach(squadId => {
                    const squad = squadsMap[squadId];
                    if (squad) {
                        orderedSquads.push(squad);
                    }
                    });
                    
                    // Add any squads not in the draft order
                    squads.forEach(squad => {
                    if (!league.snake_draft_order.includes(squad.id)) {
                        orderedSquads.push(squad);
                    }
                    });
                }
                
                console.log("Ordered squads:", orderedSquads.map(s => s.id));
                
                // Get max length of draft rankings
                const maxRankings = Math.max(...orderedSquads.map(s => (s.draft_ranking || []).length), 0);
                
                // Create rows for each player position in the draft
                return Array.from({ length: maxRankings }).map((_, rankIndex) => (
                    <tr key={`rank-${rankIndex}`}>
                    {/* Player rank as the first cell in each row */}
                    <td className="sticky left-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {rankIndex + 1}
                    </td>
                    
                    {/* For each squad in draft order, show the player at this rank */}
                    {orderedSquads.map(squad => {
                        // Get the player ID at this rank
                        const playerId = squad.draft_ranking?.[rankIndex];
                        if (!playerId) return (
                        <td key={`${squad.id}-rank-${rankIndex}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
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
                            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${
                            isInSquad ? 'bg-green-50 dark:bg-green-900' : ''
                            }`}
                        >
                            {player ? (
                            <div className={`px-2 py-1 rounded ${
                                isInSquad ? 'text-green-700 dark:text-green-300 font-medium border border-green-300 dark:border-green-700' : ''
                            }`}>
                                {player.name}
                            </div>
                            ) : (
                            <div className="text-gray-400">
                                Unknown Player (ID: {playerId})
                            </div>
                            )}
                        </td>
                        );
                    })}
                    </tr>
                ));
                })()}
            </>
            )}
            
            {/* ROLES VIEW */}
            {activeView === 'roles' && (
              Object.entries({
                BAT: 'BAT',
                BOWL: 'BOWL',
                ALL: 'ALL',
                WK: 'WK'
              }).map(([role, label]) => (
                <tr key={role}>
                  <td className="sticky left-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                    {label}
                  </td>
                  
                  {squads.map(squad => (
                    <td key={`${squad.id}-${role}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 align-top">
                      <div className="space-y-1">
                        {playersByRole[squad.id]?.[role]?.map(player => {
                          const { demandClass, avgRank, isTopPick } = getPlayerDemandInfo(player.id);
                          return (
                            <div 
                              key={player.id} 
                              className={`px-2 py-1 rounded relative ${demandClass}`}
                              onMouseEnter={(e) => showTooltip(player.id, e, isTopPick)}
                              onMouseLeave={hideTooltip}
                            >
                              {isTopPick && <Flame className="h-3 w-3 inline-block mr-1 text-white" />}
                              {player.name}
                              {tooltip.visible && tooltip.playerId === parseInt(player.id) && (
                                <div 
                                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded z-50"
                                >
                                  Avg. Rank: {avgRank}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
              )].sort().map(teamCode => (
                <tr key={teamCode}>
                  <td className="sticky left-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                    {teamCode}
                  </td>
                  
                  {squads.map(squad => (
                    <td key={`${squad.id}-${teamCode}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 align-top">
                      <div className="space-y-1">
                        {playersByTeam[squad.id]?.[teamCode]?.map(player => {
                          const { demandClass, avgRank, isTopPick } = getPlayerDemandInfo(player.id);
                          return (
                            <div 
                              key={player.id} 
                              className={`px-2 py-1 rounded relative ${demandClass}`}
                              onMouseEnter={(e) => showTooltip(player.id, e, isTopPick)}
                              onMouseLeave={hideTooltip}
                            >
                              {isTopPick && <Flame className="h-3 w-3 inline-block mr-1 text-white" />}
                              {player.name}
                              {tooltip.visible && tooltip.playerId === parseInt(player.id) && (
                                <div 
                                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded z-50"
                                >
                                  Avg. Rank: {avgRank}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
                  rattler: 'Rattler',
                  constrictor: 'Constrictor',
                  virtuoso: 'Virtuoso',
                }).map(([roleKey, roleLabel]) => (
                  <tr key={roleKey}>
                    <td className=" text-xs sticky left-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <div className="mr-1">
                          {getRoleIcon(roleLabel, 16)}
                        </div>
                        {roleLabel}
                      </div>
                    </td>
                    
                    {squads.map(squad => {
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
                      
                      // Check if player is a top pick
                      const { demandClass, avgRank, isTopPick } = boostPlayerId ? 
                        getPlayerDemandInfo(boostPlayerId) : { demandClass: '', avgRank: 'N/A', isTopPick: false };
                      
                      return (
                        <td key={`${squad.id}-${roleKey}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 align-top">
                          {boostPlayer ? (
                            <div 
                              className={`py-1 rounded relative ${demandClass}`}
                              onMouseEnter={(e) => showTooltip(boostPlayerId, e, isTopPick)}
                              onMouseLeave={hideTooltip}
                            >
                              {isTopPick && <Flame className="h-3 w-3 inline-block mr-1 text-white" />}
                              {boostPlayer.name}
                              {tooltip.visible && tooltip.playerId === parseInt(boostPlayerId) && (
                                <div 
                                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded z-50"
                                >
                                  Avg. Rank: {avgRank}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">Not assigned</span>
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
      
      {/* Legend for player demand */}
    <div className="flex items-center justify-end space-x-4 text-sm mt-4">
    <div className="flex items-center">
        <div className="h-5 w-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded flex items-center justify-center">
        <Flame className="h-3 w-3 text-white" />
        </div>
        <span className="text-gray-600 dark:text-gray-300 ml-2">Top 5 in demand</span>
    </div>
    <div className="flex items-center">
        <div className="h-5 w-5 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-800 dark:to-yellow-900 border border-amber-300 dark:border-amber-700 rounded mr-2"></div>
        <span className="text-gray-600 dark:text-gray-300">Top 6-15 in demand</span>
    </div>
    </div>
      
      {/* Add CSS for the fire effect */}
      <style jsx>{`
        @keyframes pulse-fire {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }
        
        .animate-pulse {
          animation: pulse-fire 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LeagueSquads;