import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../utils/axios';
import { Users, Zap, Trophy, Globe, Crown, Swords, Anchor, Handshake, Bomb, Shield, Sparkles, BarChartHorizontal, ShieldHalf, Volleyball } from 'lucide-react';
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
    case 'Guardian':
      return <Shield size={size} style={{color: squadColor}} />;
    default: // Virtuoso
      return <Sparkles size={size} style={{color: squadColor}} />;
  }
};

const LeagueSquads = ({ league }) => {
  const { user } = useAuth();
  const [squads, setSquads] = useState([]);
  const [playersData, setPlayersData] = useState([]);
  const [squadPlayers, setSquadPlayers] = useState({});
  const [draftData, setDraftData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('names'); // 'names', 'draft', 'mid_season_draft', 'roles', 'teams', 'boosts'
  const [avgMidSeasonDraftRanks, setAvgMidSeasonDraftRanks] = useState({});

  useEffect(() => {
    const fetchSquadsData = async () => {
      if (!league?.id) return;
      
      try {
        setLoading(true);
        
        // Fetch all league squads data using the new endpoint
        const squadsResponse = await api.get(`/leagues/${league.id}/squads/`);
        const { squads: squadsData, avg_draft_ranks, avg_mid_season_draft_ranks } = squadsResponse.data;
        
        // Sort squads by snake_draft_order if available
        let sortedSquads = [...squadsData];
        if (league.snake_draft_order && league.snake_draft_order.length > 0) {
          const squadsMap = {};
          squadsData.forEach(squad => {
            squadsMap[squad.id] = squad;
          });
          sortedSquads = [];
          league.snake_draft_order.forEach(squadId => {
            if (squadsMap[squadId]) {
              sortedSquads.push(squadsMap[squadId]);
              delete squadsMap[squadId];
            }
          });
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
        
        // Store mid-season average ranks
        setAvgMidSeasonDraftRanks(avg_mid_season_draft_ranks || {});
        
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
      players
        .filter(player => player.status === 'current')
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

  // Calculate ordered squads for draft views outside the return statement
  const orderedPreSeasonSquads = useMemo(() => {
    let ordered = [...squads];
    if (league?.snake_draft_order?.length > 0) {
      const squadsMap = squads.reduce((acc, squad) => {
        acc[squad.id] = squad;
        return acc;
      }, {});
      ordered = league.snake_draft_order
        .map(squadId => squadsMap[squadId])
        .filter(Boolean);
      // Add any squads not in the draft order
      squads.forEach(squad => {
        if (!league.snake_draft_order.includes(squad.id)) {
          ordered.push(squad);
        }
      });
    }
    return ordered;
  }, [squads, league?.snake_draft_order]);

  const orderedMidSeasonSquads = useMemo(() => {
    let ordered = [...squads];
    if (league?.mid_season_draft_order?.length > 0) {
      const squadsMap = squads.reduce((acc, squad) => {
        acc[squad.id] = squad;
        return acc;
      }, {});
      ordered = league.mid_season_draft_order
        .map(squadId => squadsMap[squadId])
        .filter(Boolean);
      // Add any remaining squads not in the order
      squads.forEach(squad => {
        if (!league.mid_season_draft_order.includes(squad.id)) {
          ordered.push(squad);
        }
      });
    } else {
      // Fallback sort if no mid-season order (e.g., by points or name)
      ordered.sort((a, b) => (a.total_points || 0) - (b.total_points || 0)); // Example: sort by lowest points first
    }
    return ordered;
  }, [squads, league?.mid_season_draft_order]);

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

  // Determine which squad list to use based on activeView
  const squadsToDisplay = 
    activeView === 'draft' ? orderedPreSeasonSquads :
    // Reverse the order for mid-season draft view
    activeView === 'mid_season_draft' ? [...orderedMidSeasonSquads].reverse() : 
    squads; // Default to original order for other views

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
        
        {/* <button
          onClick={() => setActiveView('draft')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            activeView === 'draft'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <BarChartHorizontal className="h-3 w-3 mr-1" /> 
          Pre-Season Draft
        </button> */}

        <button
          onClick={() => setActiveView('mid_season_draft')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            activeView === 'mid_season_draft'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          <BarChartHorizontal className="h-3 w-3 mr-1" />
          Mid-Season Draft
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
      
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20"> 
            <tr className="bg-neutral-50 dark:bg-neutral-700">
              {activeView !== 'names' && (
                <th className="sticky left-0 bg-neutral-50 dark:bg-neutral-700 z-30 px-2 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
                  {activeView === 'teams' ? 'IPL Team' : (activeView === 'draft' || activeView === 'mid_season_draft' ? 'Rank' : activeView === 'roles' ? 'Role' : 'Boost')}
                </th>
              )}
              
              {squadsToDisplay.map(squad => (
                <th 
                  key={squad.id}
                  className="px-2 py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600"
                  style={{ minWidth: '120px' }}
                >
                  <Link 
                    to={squad.user === user?.id ? `/leagues/${league.id}/my_squad` : `/leagues/${league.id}/squads/${squad.id}`}
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
            {activeView === 'names' && (
              <tr>
                {squadsToDisplay.map(squad => (
                  <td key={squad.id} className="p-0 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400 align-top border border-neutral-200 dark:border-neutral-600">
                    {squadPlayers[squad.id]
                      ?.filter(player => player.status === 'current')
                      .map(player => (
                        <div 
                          key={player.id} 
                          className={`px-1 py-1 truncate border-b border-neutral-100 dark:border-neutral-700`}
                        >
                          {player.name}
                        </div>
                      ))}
                  </td>
                ))}
              </tr>
            )}
            
            {activeView === 'draft' && (
              (() => {
                const maxRankings = Math.max(...orderedPreSeasonSquads.map(s => (s.draft_ranking || []).length), 0);
                return Array.from({ length: maxRankings }).map((_, rankIndex) => (
                  <tr key={`rank-${rankIndex}`} className={rankIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'}>
                    <td className="sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600"
                        style={{ backgroundColor: rankIndex % 2 === 0 ? 'var(--color-neutral-50)' : 'var(--color-white)', zIndex: 10 }}
                    >
                      {rankIndex + 1}
                    </td>
                    {orderedPreSeasonSquads.map(squad => {
                      const playerId = squad.draft_ranking?.[rankIndex];
                      if (!playerId) return (
                        <td key={`${squad.id}-rank-${rankIndex}`} className="px-2 py-1 whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-600">
                          -
                        </td>
                      );
                      const playerIdInt = typeof playerId === 'string' ? parseInt(playerId) : playerId;
                      const player = playersData.find(p => p.id === playerIdInt);
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

            {activeView === 'mid_season_draft' && (
              (() => {
                const maxRankings = Math.max(...orderedMidSeasonSquads.map(s => (s.mid_season_draft_ranking || []).length), 0);
                // Use the same reversed array as the header
                const reversedOrderedSquads = [...orderedMidSeasonSquads].reverse(); 
                return Array.from({ length: maxRankings }).map((_, rankIndex) => (
                  <tr key={`mid-rank-${rankIndex}`} className={rankIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'}>
                    <td className="sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600"
                        style={{ backgroundColor: rankIndex % 2 === 0 ? 'var(--color-neutral-50)' : 'var(--color-white)', zIndex: 10 }}
                    >
                      {rankIndex + 1}
                    </td>
                    {/* Map over the reversed array */}
                    {reversedOrderedSquads.map(squad => { 
                      const playerId = squad.mid_season_draft_ranking?.[rankIndex];
                      if (!playerId) return (
                        <td key={`${squad.id}-mid-rank-${rankIndex}`} className="px-2 py-1 whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-600">
                          -
                        </td>
                      );
                      const playerIdInt = typeof playerId === 'string' ? parseInt(playerId) : playerId;
                      const player = playersData.find(p => p.id === playerIdInt);
                      const isRetained = squad.current_core_squad?.some(core => core.player_id === playerIdInt);
                      const isInSquad = squad.players?.some(p => p.id === playerIdInt && p.status === 'current');
                      let cellClass = `px-2 py-1 whitespace-nowrap text-xs truncate border border-neutral-200 dark:border-neutral-600`;
                      if (isRetained) {
                        cellClass += ' text-neutral-400 dark:text-neutral-500 italic';
                      } else if (isInSquad) {
                        cellClass += ' bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300';
                      } else {
                        cellClass += ' text-neutral-500 dark:text-neutral-400';
                      }
                      return (
                        <td key={`${squad.id}-mid-rank-${rankIndex}`} className={cellClass}>
                          {player ? player.name : `ID: ${playerId}`}
                          {isRetained && ' (R)'}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()
            )}
            
            {activeView === 'roles' && (
              Object.entries({
                BAT: 'BAT',
                BOWL: 'BOWL',
                ALL: 'ALL',
                WK: 'WK'
              }).map(([role, label], roleIndex) => (
                <tr key={role} className={roleIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'}>
                  <td className="sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600"
                      style={{ backgroundColor: roleIndex % 2 === 0 ? 'var(--color-neutral-50)' : 'var(--color-white)', zIndex: 10 }}
                  >
                    {label}
                  </td>
                  {squadsToDisplay.map(squad => (
                    <td key={`${squad.id}-${role}`} className="p-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">
                      {playersByRole[squad.id]?.[role]
                        ?.filter(player => player.status === 'current')
                        ?.map(player => (
                          <div 
                            key={player.id} 
                            className={`px-1 py-0.5 truncate`}
                          >
                            {player.name}
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              ))
            )}
            
            {activeView === 'teams' && (
              [...new Set(
                Object.values(playersByTeam)
                  .flatMap(teamMap => Object.keys(teamMap))
              )].sort().map((teamCode, teamIndex) => (
                <tr key={teamCode} className={teamIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'}>
                  <td className="sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600"
                      style={{ backgroundColor: teamIndex % 2 === 0 ? 'var(--color-neutral-50)' : 'var(--color-white)', zIndex: 10 }}
                  >
                    {teamCode}
                  </td>
                  {squadsToDisplay.map(squad => (
                    <td key={`${squad.id}-${teamCode}`} className="p-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">
                      {playersByTeam[squad.id]?.[teamCode]
                        ?.filter(player => player.status === 'current')
                        ?.map(player => (
                          <div 
                            key={player.id} 
                            className={`px-1 py-0.5 truncate`}
                          >
                            {player.name}
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              ))
            )}
            
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
                  guardian: 'Guardian',
                }).map(([roleKey, roleLabel], roleIndex) => (
                  <tr key={roleKey} className={roleIndex % 2 === 0 ? 'bg-neutral-50 dark:bg-neutral-700' : 'bg-white dark:bg-neutral-800'}>
                    <td className="sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-xs text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-600"
                        style={{ backgroundColor: roleIndex % 2 === 0 ? 'var(--color-neutral-50)' : 'var(--color-white)', zIndex: 10 }}
                    >
                      <div className="flex items-center gap-1">
                        {getRoleIcon(roleLabel, 14)}
                        <span className="truncate">{roleLabel}</span>
                      </div>
                    </td>
                    {squadsToDisplay.map(squad => {
                      const coreSquad = squad.current_core_squad || {};
                      let boostPlayerId = null;
                      if (Array.isArray(coreSquad)) {
                        const roleKeyToId = {
                          'captain': 1,
                          'vice_captain': 2,
                          'slogger': 3,
                          'accumulator': 4,
                          'safe_hands': 5,
                          'rattler': 6,
                          'guardian': 7,
                          'virtuoso': 8
                        };
                        const boostObj = coreSquad.find(b => b.boost_id === roleKeyToId[roleKey]);
                        boostPlayerId = boostObj ? boostObj.player_id : null;
                      } else {
                        boostPlayerId = coreSquad[roleKey];
                      }
                      const boostPlayer = boostPlayerId && squadPlayers[squad.id] 
                        ? squadPlayers[squad.id].find(p => p.id === boostPlayerId)
                        : null;
                      return (
                        <td key={`${squad.id}-${roleKey}`} className="p-0 whitespace-nowrap text-xs border border-neutral-200 dark:border-neutral-600">
                          {boostPlayer ? (
                            <div 
                              className={`w-full h-full px-2 py-1 truncate`} 
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
    </div>
  );
};

export default LeagueSquads;
