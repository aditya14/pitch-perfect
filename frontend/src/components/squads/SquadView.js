import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import PlayerListTab from './PlayerListTab';
import BoostTab from './BoostTab';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, Trophy } from 'lucide-react';
import LoadingScreen from '../elements/LoadingScreen';

const SquadView = ({ squadId: propSquadId, leagueContext = false }) => {
  const { squadId: paramSquadId, leagueId: paramLeagueId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Use squadId from props (league context) or from params (direct access)
  const squadId = propSquadId || paramSquadId;
  const leagueIdFromContext = paramLeagueId; // When in league context, get from URL params
  
  const [activeTab, setActiveTab] = useState('players');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [squadData, setSquadData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [boostRoles, setBoostRoles] = useState([]);
  const [playerEvents, setPlayerEvents] = useState({});
  const [isOwnSquad, setIsOwnSquad] = useState(false);
  const [rankInfo, setRankInfo] = useState({ rank: null, totalSquads: null });
  const [activePhaseAssignments, setActivePhaseAssignments] = useState([]);
  const [hasActivePhase, setHasActivePhase] = useState(false);
  const [phaseStatus, setPhaseStatus] = useState({
    label: null,
    state: 'none',
    lockAt: null,
  });
  const [boostLockTimeRemaining, setBoostLockTimeRemaining] = useState(null);
  
  // Set document title based on squad name and active tab
  const getPageTitle = () => {
    if (!squadData) return 'Squad Details';
    if (leagueContext) {
      return `My Squad - ${squadData.name}`;
    }
    return `${squadData.name} (${squadData.league_name})`;
  };
  
  // Apply the document title
  useDocumentTitle(getPageTitle());

  useEffect(() => {
    const fetchSquadData = async () => {
      const parsePhaseDate = (dateValue) => {
        if (!dateValue) return null;
        const parsed = new Date(dateValue);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };

      try {
        setLoading(true);
        
        const squadResponse = await api.get(`/squads/${squadId}/`);
        const squadData = squadResponse.data;
        setSquadData(squadData);
        
        // Check if this is the user's own squad
        setIsOwnSquad(squadData.user_id === user?.id);
  
        // Get league info to calculate rank
        if (squadData.league_id) {
          try {
            const leagueResponse = await api.get(`/leagues/${squadData.league_id}/`);
            const leagueData = leagueResponse.data;
            
            // Sort squads by total_points to get rank
            const sortedSquads = [...leagueData.squads].sort((a, b) => b.total_points - a.total_points);
            const squadRank = sortedSquads.findIndex(squad => squad.id === parseInt(squadId)) + 1;
            setRankInfo({
              rank: squadRank,
              totalSquads: sortedSquads.length
            });
          } catch (rankErr) {
            console.warn('Non-critical: Failed to calculate rank:', rankErr);
          }
        }
  
        // This call now returns both current and traded players
        const playersResponse = await api.get(`/squads/${squadId}/players/`);
        setPlayers(playersResponse.data);
  
        const rolesResponse = await api.get('/fantasy/boost-roles/');
        setBoostRoles(rolesResponse.data);
  
        try {
          const eventsResponse = await api.get(`/squads/${squadId}/player-events/`);
          setPlayerEvents(eventsResponse.data || {});
        } catch (eventErr) {
          console.warn('Non-critical: Failed to load player events:', eventErr);
          setPlayerEvents({});
        }

        try {
          const phaseBoostResponse = await api.get(`/squads/${squadId}/phase-boosts/`);
          const phases = phaseBoostResponse.data?.phases || [];
          const assignmentsByPhase = phaseBoostResponse.data?.assignments || {};
          const now = new Date();
          const phaseMeta = phases
            .map((phase) => {
              const startAt = parsePhaseDate(phase.start);
              const endAt = parsePhaseDate(phase.end);
              const openAt = parsePhaseDate(phase.open_at);
              const lockAt = parsePhaseDate(phase.lock_at);
              const isCurrent = startAt && endAt ? now >= startAt && now <= endAt : false;
              const isUpcoming = startAt ? now < startAt : false;
              const status = isCurrent ? 'current' : isUpcoming ? 'upcoming' : 'completed';
              return {
                ...phase,
                startAt,
                endAt,
                openAt,
                lockAt,
                status,
              };
            })
            .sort((a, b) => (a.phase || 0) - (b.phase || 0));

          const openPhase = phaseMeta.find(
            (phase) => phase.openAt && now >= phase.openAt && (!phase.lockAt || now < phase.lockAt)
          );
          const nextPhase = phaseMeta.find(
            (phase) => phase.openAt && now < phase.openAt
          );

          const currentPhase = phaseMeta.find((phase) => phase.status === 'current');

          if (currentPhase?.id) {
            const phaseAssignments = assignmentsByPhase[currentPhase.id] || assignmentsByPhase[String(currentPhase.id)] || [];
            setActivePhaseAssignments(Array.isArray(phaseAssignments) ? phaseAssignments : []);
            setHasActivePhase(true);
          } else {
            setActivePhaseAssignments([]);
            setHasActivePhase(false);
          }

          if (openPhase) {
            setPhaseStatus({
              label: openPhase.label || `Phase ${openPhase.phase || ''}`.trim(),
              state: 'open',
              lockAt: openPhase.lockAt,
            });
          } else if (nextPhase) {
            setPhaseStatus({
              label: nextPhase.label || `Phase ${nextPhase.phase || ''}`.trim(),
              state: 'upcoming',
              lockAt: nextPhase.lockAt,
            });
          } else {
            setPhaseStatus({
              label: null,
              state: 'locked',
              lockAt: null,
            });
          }
        } catch (phaseErr) {
          console.warn('Non-critical: Failed to load active phase assignments:', phaseErr);
          setActivePhaseAssignments([]);
          setHasActivePhase(false);
          setPhaseStatus({
            label: null,
            state: 'none',
            lockAt: null,
          });
        }
  
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching squad data:', err);
        setError('Failed to load squad data. Please try again later.');
        setLoading(false);
      }
    };
  
    if (squadId) {
      fetchSquadData();
    }
  }, [squadId, user]);

  useEffect(() => {
    if (!phaseStatus?.lockAt || phaseStatus.state !== 'open') {
      setBoostLockTimeRemaining(null);
      return undefined;
    }

    const calculateTimeRemaining = () => {
      const difference = phaseStatus.lockAt - new Date();
      if (difference <= 0) return null;

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setBoostLockTimeRemaining(calculateTimeRemaining());
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setBoostLockTimeRemaining(remaining);
      if (!remaining) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [phaseStatus?.lockAt, phaseStatus?.state]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = (searchParams.get('tab') || '').toLowerCase();
    if (tabParam === 'boosts' || tabParam === 'core') {
      setActiveTab('core');
    } else if (tabParam === 'players') {
      setActiveTab('players');
    }
  }, [location.search]);

  const updateFutureCoreSquad = async (boost_id, player_id, phase_id) => {
    if (!isOwnSquad) return; // Prevent updates for other users' squads
    
    try {
      const response = await api.patch(`/squads/${squadId}/core-squad/`, {
        boost_id,
        player_id,
        phase_id
      });
      
      // Refresh squad data to get updated core squad assignments
      if (!phase_id) {
        const squadResponse = await api.get(`/squads/${squadId}/`);
        setSquadData(squadResponse.data);
      }
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to update core squad roles');
    }
  };

  const handleBackToLeague = () => {
    if (leagueContext && leagueIdFromContext) {
      // When in league context, go back to league dashboard
      navigate(`/leagues/${leagueIdFromContext}/dashboard`);
    } else if (squadData?.league_id) {
      // When accessed directly, go to league dashboard
      navigate(`/leagues/${squadData.league_id}/dashboard`);
    } else {
      // Fallback to user dashboard
      navigate('/dashboard');
    }
  };

  const getBackButtonText = () => {
    if (leagueContext) {
      return squadData?.league_name || 'Back to League';
    }
    return squadData?.league_name || 'Back';
  };

  const showBoostTab = isOwnSquad;
  const squadInitials = (squadData?.name || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const formattedPoints = Number.isInteger(squadData?.total_points)
    ? squadData?.total_points
    : parseFloat(squadData?.total_points || 0).toFixed(1);
  const formatCountdownUnit = (value) => (value < 10 ? `0${value}` : `${value}`);
  const getCountdownUnits = (remaining) => {
    if (!remaining) return [];
    if (remaining.days > 0) {
      return [
        { label: 'd', value: remaining.days },
        { label: 'h', value: remaining.hours },
      ];
    }
    if (remaining.hours > 0) {
      return [
        { label: 'h', value: remaining.hours },
        { label: 'm', value: remaining.minutes },
      ];
    }
    return [
      { label: 'm', value: remaining.minutes },
      { label: 's', value: remaining.seconds },
    ];
  };
  if (loading) {
    return <LoadingScreen message="Loading Squad" description='One moment please' />;
  }

  if (error) {
    return (
      <div className="lg-alert lg-glass-danger">
        {error}
      </div>
    );
  }

  if (!squadData) {
    return (
      <div className="lg-alert lg-glass-warning text-amber-700 dark:text-amber-300">
        Squad not found or you don't have access to this squad.
      </div>
    );
  }

  return (
    <div className={leagueContext ? 'px-1 sm:px-2 pt-6 md:pt-2 pb-2' : 'container mx-auto px-4 py-8'}>
      <div className="mb-6">
        <div
          className="lg-glass lg-rounded-xl lg-shine p-4 sm:p-6 border border-white/40 dark:border-white/10"
          style={{
            backgroundImage: `linear-gradient(135deg, ${squadData.color}22 0%, rgba(255,255,255,0.03) 55%, ${squadData.color}10 100%)`,
          }}
        >
          {/* Back Navigation - only show if not in league context */}
          {!leagueContext && (
            <button
              onClick={handleBackToLeague}
              className="flex items-center justify-center lg:justify-start text-primary-600 dark:text-primary-400 mb-4 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft size={16} className="mr-1" />
              <span className="text-sm">{getBackButtonText()}</span>
            </button>
          )}

          <div className="flex flex-col lg:flex-row items-center lg:items-center lg:justify-between gap-5">
            <div className="flex items-center justify-center lg:justify-start gap-4 w-full lg:w-auto">
              <div
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center text-white font-bold font-caption shadow-md"
                style={{ backgroundColor: squadData.color }}
              >
                {squadInitials || 'S'}
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {squadData.league_name}
                </div>
                <h1 className="text-2xl sm:text-3xl font-caption font-bold text-neutral-900 dark:text-white leading-tight">
                  {squadData.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-white/70 dark:bg-black/40 text-neutral-800 dark:text-neutral-200 border border-white/60 dark:border-white/10">
                    <Trophy className="h-3.5 w-3.5" />
                    Rank {rankInfo.rank ? `${rankInfo.rank}/${rankInfo.totalSquads}` : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-end gap-3 w-full lg:w-auto">
              <div className="text-center lg:text-right">
                <div className="text-3xl sm:text-4xl leading-none font-bold text-primary-600 dark:text-primary-400 font-number">
                  {formattedPoints}
                </div>
                <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Points</div>
              </div>
              <div className="flex flex-col items-center lg:items-end gap-2 w-full lg:w-auto">
                {showBoostTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === 'core' ? 'players' : 'core')}
                    className="w-full sm:w-auto py-2 px-4 lg-button text-white text-xs font-medium lg-rounded-md transition-all duration-200 inline-flex items-center justify-center"
                  >
                    <span className="font-caption font-bold">
                      {activeTab === 'core' ? 'View Player List' : 'Edit Boosts'}
                    </span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                )}
                {activeTab !== 'core' && phaseStatus.state === 'open' && boostLockTimeRemaining && (
                  <div className="mt-2 flex flex-wrap items-center justify-center lg:justify-end gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Locks in
                    </span>
                    <div className="text-sm flex items-center gap-2 font-semibold">
                      <div className="flex gap-2 text-neutral-900 dark:text-white">
                        {getCountdownUnits(boostLockTimeRemaining).map((unit) => (
                          <span key={unit.label} className="font-mono">{formatCountdownUnit(unit.value)}{unit.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {(!showBoostTab || activeTab === 'players') ? (
          <PlayerListTab
            players={players}
            playerEvents={playerEvents}
            currentCoreSquad={squadData.current_core_squad}
            activePhaseAssignments={activePhaseAssignments}
            hasActivePhase={hasActivePhase}
            boostRoles={boostRoles}
            leagueId={squadData.league_id}
            squadColor={squadData.color}
          />
        ) : (
          <BoostTab
            squadId={squadId}
            players={players}
            boostRoles={boostRoles}
            currentCoreSquad={squadData.current_core_squad}
            onUpdateRole={updateFutureCoreSquad}
            isOwnSquad={isOwnSquad}
            leagueId={squadData.league_id}
            squadColor={squadData.color}
          />
        )}
      </div>
    </div>
  );
};

export default SquadView;
