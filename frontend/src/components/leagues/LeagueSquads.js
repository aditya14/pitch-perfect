import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../utils/axios';
import { Users, Zap, Crown, Swords, Anchor, Handshake, Bomb, Shield, Sparkles, BarChartHorizontal, ShieldHalf, Volleyball, Bandage } from 'lucide-react';
import LoadingScreen from '../elements/LoadingScreen';
import StickyTableShell from '../elements/StickyTableShell';

// Helper function to get role icon
const getRoleIcon = (roleName, size = 16, squadColor) => {
  switch(roleName) {
    case 'Captain':
      return <Crown size={size} style={{color: squadColor}} />;
    case 'Vice-Captain':
      return <Swords size={size} style={{color: squadColor}} />;
    case 'Slogger':
      return <Zap size={size} style={{color: squadColor}} />;
    case 'Anchor':
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
  const [draftTabs, setDraftTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('names');
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [activeDraftRole, setActiveDraftRole] = useState('BAT');
  const [squadActiveBoostAssignments, setSquadActiveBoostAssignments] = useState({});

  useEffect(() => {
    const fetchSquadsData = async () => {
      if (!league?.id) return;

      const parsePhaseDate = (dateValue) => {
        if (!dateValue) return null;
        const parsed = new Date(dateValue);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };
      
      try {
        setLoading(true);
        
        // Fetch league squads and draft windows in parallel.
        const squadsResponse = await api.get(`/leagues/${league.id}/squads/`);
        const { squads: squadsData } = squadsResponse.data;
        let windows = [];
        if (league.season?.id) {
          try {
            const draftWindowsResponse = await api.get(`/draft-windows/?season=${league.season.id}`);
            windows = draftWindowsResponse.data || [];
          } catch (draftWindowError) {
            // Non-critical fallback: keep default draft labels if draft windows fail to load.
            console.warn('Unable to load draft windows for squad tabs:', draftWindowError);
          }
        }
        
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

        // Resolve active phase boost assignments per squad.
        // Falls back to current_core_squad if no active phase assignment exists.
        try {
          const now = new Date();
          const assignmentResults = await Promise.allSettled(
            sortedSquads.map(async (squad) => {
              const response = await api.get(`/squads/${squad.id}/phase-boosts/`);
              const phases = response.data?.phases || [];
              const assignmentsByPhase = response.data?.assignments || {};

              const currentPhase = phases.find((phase) => {
                const startAt = parsePhaseDate(phase.start);
                const endAt = parsePhaseDate(phase.end);
                return startAt && endAt ? now >= startAt && now <= endAt : false;
              });

              if (currentPhase?.id) {
                const phaseAssignments = assignmentsByPhase[currentPhase.id] || assignmentsByPhase[String(currentPhase.id)] || [];
                return { squadId: squad.id, assignments: Array.isArray(phaseAssignments) ? phaseAssignments : [] };
              }

              return { squadId: squad.id, assignments: Array.isArray(squad.current_core_squad) ? squad.current_core_squad : [] };
            })
          );

          const nextMap = {};
          assignmentResults.forEach((result, index) => {
            const squadId = sortedSquads[index]?.id;
            if (!squadId) return;
            if (result.status === 'fulfilled') {
              nextMap[squadId] = result.value.assignments || [];
            } else {
              const fallback = sortedSquads[index]?.current_core_squad;
              nextMap[squadId] = Array.isArray(fallback) ? fallback : [];
            }
          });
          setSquadActiveBoostAssignments(nextMap);
        } catch (phaseErr) {
          console.warn('Non-critical: Failed to resolve active squad phase boosts:', phaseErr);
          const fallbackMap = {};
          sortedSquads.forEach((squad) => {
            fallbackMap[squad.id] = Array.isArray(squad.current_core_squad) ? squad.current_core_squad : [];
          });
          setSquadActiveBoostAssignments(fallbackMap);
        }
        
        const preWindow = windows
          .filter(window => window.kind === 'PRE_SEASON')
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))[0];
        const midWindow = windows
          .filter(window => window.kind === 'MID_SEASON')
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))[0];

        const hasPreDraft = sortedSquads.some(squad => (squad.draft_ranking || []).length > 0);
        const hasMidDraft = sortedSquads.some(squad => (squad.mid_season_draft_ranking || []).length > 0);

        const nextDraftTabs = [];
        if (hasPreDraft) {
          nextDraftTabs.push({
            id: 'draft_pre',
            label: preWindow?.label || 'Pre-Season Draft',
          });
        }
        if (hasMidDraft) {
          nextDraftTabs.push({
            id: 'draft_mid',
            label: midWindow?.label || 'Mid-Season Draft',
          });
        }
        setDraftTabs(nextDraftTabs);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching squads data:', err);
        setError('Failed to load squads data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchSquadsData();
  }, [league]);

  useEffect(() => {
    if (!draftTabs.length) {
      setActiveDraftId(null);
      return;
    }
    if (activeDraftId && !draftTabs.some(tab => tab.id === activeDraftId)) {
      setActiveDraftId(null);
      setActiveDraftRole('BAT');
    }
  }, [draftTabs, activeDraftId]);
  
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
  
  // Group players by team
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

  const currentPlayerIdSets = useMemo(() => {
    const map = {};
    Object.entries(squadPlayers).forEach(([squadId, players]) => {
      map[squadId] = new Set(
        (players || [])
          .filter(player => player.status === 'current')
          .map(player => Number(player.id))
          .filter(Number.isFinite)
      );
    });
    return map;
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
      <div className="lg-alert lg-glass-danger">
        {error}
      </div>
    );
  }

  // Determine which squad list to use based on activeView
  const isDraftView = Boolean(activeDraftId);
  const baseDraftSquads =
    activeDraftId === 'draft_pre'
      ? orderedPreSeasonSquads
      : activeDraftId === 'draft_mid'
        ? [...orderedMidSeasonSquads].reverse()
        : squads;

  // For snake draft readability:
  // BAT/ALL keep base order, WK/BOWL use reversed order.
  const shouldReverseDraftColumns =
    isDraftView && (activeDraftRole === 'WK' || activeDraftRole === 'BOWL');

  const squadsToDisplay = shouldReverseDraftColumns
    ? [...baseDraftSquads].reverse()
    : baseDraftSquads;

  const ROLE_OPTIONS = ['BAT', 'WK', 'ALL', 'BOWL'];

  const handleStandardViewChange = (view) => {
    setActiveView(view);
    setActiveDraftId(null);
  };

  const getDraftRankingForSquad = (squad) => {
    if (!squad) return [];
    if (activeDraftId === 'draft_pre') {
      const roleOrder = squad.pre_season_rankings_by_role?.[activeDraftRole] || [];
      if (roleOrder.length) return roleOrder;
      if (activeDraftRole === 'BAT') return squad.draft_ranking || [];
      return [];
    }
    if (activeDraftId === 'draft_mid') {
      const roleOrder = squad.mid_season_rankings_by_role?.[activeDraftRole] || [];
      if (roleOrder.length) return roleOrder;
      return squad.mid_season_draft_ranking || [];
    }
    return [];
  };

  const renderPlayerName = (player) => {
    const injuryTooltip = player?.replacement?.name
      ? `Ruled out. Replacement: ${player.replacement.name}`
      : 'Ruled out';

    return (
      <span className="inline-flex items-center gap-1 min-w-0">
        <span className="truncate">{player.name}</span>
        {player.ruled_out && (
          <Bandage
            size={12}
            className="text-rose-500 dark:text-rose-400 flex-shrink-0"
            title={injuryTooltip}
            aria-label={injuryTooltip}
          />
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4 pt-6 md:pt-0">
      {/* View Selection Tabs */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleStandardViewChange('names')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            !isDraftView && activeView === 'names'
              ? 'lg-glass-primary text-primary-700 dark:text-primary-300'
              : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
          }`}
        >
          <Users className="h-3 w-3 mr-1" />
          All Players
        </button>
        
        <button
          onClick={() => handleStandardViewChange('roles')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            !isDraftView && activeView === 'roles'
              ? 'lg-glass-primary text-primary-700 dark:text-primary-300'
              : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
          }`}
        >
          <Volleyball className="h-3 w-3 mr-1" />
          By Role
        </button>
        
        <button
          onClick={() => handleStandardViewChange('teams')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            !isDraftView && activeView === 'teams'
              ? 'lg-glass-primary text-primary-700 dark:text-primary-300'
              : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
          }`}
        >
          <ShieldHalf className="h-3 w-3 mr-1" />
          By Team
        </button>
        
        <button
          onClick={() => handleStandardViewChange('boosts')}
          className={`flex items-center px-3 py-2 text-xs rounded-md ${
            !isDraftView && activeView === 'boosts'
              ? 'lg-glass-primary text-primary-700 dark:text-primary-300'
              : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
          }`}
        >
          <Zap className="h-3 w-3 mr-1" />
          Boosts
        </button>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          {!!draftTabs.length && (
            <div className="flex flex-wrap gap-2">
              {draftTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (activeDraftId === tab.id) {
                      setActiveDraftId(null);
                      return;
                    }
                    setActiveDraftId(tab.id);
                    setActiveDraftRole('BAT');
                  }}
                  className={`flex items-center px-3 py-2 text-xs rounded-md ${
                    activeDraftId === tab.id
                      ? 'lg-glass-primary text-primary-700 dark:text-primary-300'
                      : 'lg-glass-tertiary text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  <BarChartHorizontal className="h-3 w-3 mr-1" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {activeDraftId && (
            <div className="flex flex-wrap items-center gap-2 lg-glass-tertiary lg-rounded-md px-2 py-2">
              {ROLE_OPTIONS.map(role => (
                <button
                  key={role}
                  onClick={() => setActiveDraftRole(role)}
                  className={`px-3 py-1.5 text-xs rounded-md ${
                    activeDraftRole === role
                      ? 'lg-glass-primary text-primary-700 dark:text-primary-300'
                      : 'lg-glass-secondary text-neutral-700 dark:text-neutral-200 hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <StickyTableShell className="lg-glass lg-rounded-xl overflow-x-auto">
        <table className="w-full border-collapse text-xs" key={`${activeDraftId || activeView}-${activeDraftRole}`}>
          <thead> 
            <tr className="lg-glass-tertiary">
              {(isDraftView || activeView !== 'names') && (
                <th className="sticky left-0 lg-glass-tertiary z-30 px-2 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/70">
                  {isDraftView ? 'Rank' : (activeView === 'teams' ? 'Team' : activeView === 'roles' ? 'Role' : 'Boost')}
                </th>
              )}
              
              {squadsToDisplay.map(squad => (
                <th 
                  key={squad.id}
                  className="px-2 py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/70"
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
            {!isDraftView && activeView === 'names' && (
              <tr>
                {squadsToDisplay.map(squad => (
                    <td key={squad.id} className="p-0 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400 align-top border border-neutral-200/60 dark:border-neutral-700/70">
                    {squadPlayers[squad.id]
                      ?.filter(player => player.status === 'current')
                      .map(player => (
                        <div 
                          key={player.id} 
                          className="px-1 py-1 truncate border-b border-neutral-100/70 dark:border-neutral-700/60"
                        >
                          {renderPlayerName(player)}
                        </div>
                      ))}
                  </td>
                ))}
              </tr>
            )}
            
            {isDraftView && (
              (() => {
                const maxRankings = Math.max(...squadsToDisplay.map(s => getDraftRankingForSquad(s).length), 0);
                if (maxRankings === 0) {
                  return (
                    <tr>
                      <td
                        colSpan={(squadsToDisplay.length || 0) + 1}
                        className="px-3 py-4 text-center text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/70"
                      >
                        No rankings available for {activeDraftRole}.
                      </td>
                    </tr>
                  );
                }
                return Array.from({ length: maxRankings }).map((_, rankIndex) => (
                  <tr key={`${activeDraftId}-${activeDraftRole}-rank-${rankIndex}`} className={rankIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}>
                    <td className={`sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200/60 dark:border-neutral-700/70 ${rankIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}`}
                        style={{ zIndex: 10 }}
                    >
                      {rankIndex + 1}
                    </td>
                    {squadsToDisplay.map(squad => {
                      const playerId = getDraftRankingForSquad(squad)?.[rankIndex];
                      if (!playerId) return (
                        <td key={`${activeDraftId}-${activeDraftRole}-${squad.id}-rank-${rankIndex}`} className="px-2 py-1 whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500 border border-neutral-200/60 dark:border-neutral-700/70">
                          -
                        </td>
                      );
                      const playerIdInt = Number(playerId);
                      const player = playersData.find(p => Number(p.id) === playerIdInt);
                      const isInSquad = Boolean(currentPlayerIdSets[squad.id]?.has(playerIdInt));
                      return (
                        <td 
                          key={`${activeDraftId}-${activeDraftRole}-${squad.id}-rank-${rankIndex}`} 
                          className={`px-2 py-1 whitespace-nowrap text-xs truncate border border-neutral-200/60 dark:border-neutral-700/70 ${
                            isInSquad
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'text-neutral-500 dark:text-neutral-400'
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
            
            {!isDraftView && activeView === 'roles' && (
              Object.entries({
                BAT: 'BAT',
                BOWL: 'BOWL',
                ALL: 'ALL',
                WK: 'WK'
              }).map(([role, label], roleIndex) => (
                <tr key={role} className={roleIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}>
                  <td className={`sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200/60 dark:border-neutral-700/70 ${roleIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}`}
                      style={{ zIndex: 10 }}
                  >
                    {label}
                  </td>
                  {squadsToDisplay.map(squad => (
                    <td key={`${squad.id}-${role}`} className="p-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/70">
                      {playersByRole[squad.id]?.[role]
                        ?.filter(player => player.status === 'current')
                        ?.map(player => (
                          <div 
                            key={player.id} 
                            className={`px-1 py-0.5 truncate`}
                          >
                            {renderPlayerName(player)}
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              ))
            )}
            
            {!isDraftView && activeView === 'teams' && (
              [...new Set(
                Object.values(playersByTeam)
                  .flatMap(teamMap => Object.keys(teamMap))
              )].sort().map((teamCode, teamIndex) => (
                <tr key={teamCode} className={teamIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}>
                  <td className={`sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-neutral-900 dark:text-white border border-neutral-200/60 dark:border-neutral-700/70 ${teamIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}`}
                      style={{ zIndex: 10 }}
                  >
                    {teamCode}
                  </td>
                  {squadsToDisplay.map(squad => (
                    <td key={`${squad.id}-${teamCode}`} className="p-1 text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/70">
                      {playersByTeam[squad.id]?.[teamCode]
                        ?.filter(player => player.status === 'current')
                        ?.map(player => (
                          <div 
                            key={player.id} 
                            className={`px-1 py-0.5 truncate`}
                          >
                            {renderPlayerName(player)}
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              ))
            )}
            
            {!isDraftView && activeView === 'boosts' && (
              squads.length > 0 && (
                Object.entries({
                  captain: 'Captain',
                  vice_captain: 'Vice-Captain',
                  slogger: 'Slogger',
                  Anchor: 'Anchor', 
                  safe_hands: 'Safe Hands',
                  virtuoso: 'Virtuoso',
                  rattler: 'Rattler',
                  guardian: 'Guardian',
                }).map(([roleKey, roleLabel], roleIndex) => (
                  <tr key={roleKey} className={roleIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}>
                    <td className={`sticky left-0 z-10 px-2 py-1 whitespace-nowrap font-medium text-xs text-neutral-900 dark:text-white border border-neutral-200/60 dark:border-neutral-700/70 ${roleIndex % 2 === 0 ? 'bg-white/30 dark:bg-black/30' : 'bg-white/10 dark:bg-black/15'}`}
                        style={{ zIndex: 10 }}
                    >
                      <div className="flex items-center gap-1">
                        {getRoleIcon(roleLabel, 14)}
                        <span className="truncate">{roleLabel}</span>
                      </div>
                    </td>
                    {squadsToDisplay.map(squad => {
                      const coreSquad = squadActiveBoostAssignments[squad.id] || squad.current_core_squad || {};
                      let boostPlayerId = null;
                      if (Array.isArray(coreSquad)) {
                        const roleKeyToId = {
                          'captain': 1,
                          'vice_captain': 2,
                          'slogger': 3,
                          'Anchor': 4,
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
                        <td key={`${squad.id}-${roleKey}`} className="p-0 whitespace-nowrap text-xs border border-neutral-200/60 dark:border-neutral-700/70">
                          {boostPlayer ? (
                            <div 
                              className={`w-full h-full px-2 py-1 truncate`} 
                            >
                              {renderPlayerName(boostPlayer)}
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
      </StickyTableShell>
    </div>
  );
};

export default LeagueSquads;
