import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import PlayerListTab from './PlayerListTab';
import BoostTab from './BoostTab';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';
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

          const currentPhase = phases.find((phase) => {
            const startAt = parsePhaseDate(phase.start);
            const endAt = parsePhaseDate(phase.end);
            return startAt && endAt ? now >= startAt && now <= endAt : false;
          });

          if (currentPhase?.id) {
            const phaseAssignments = assignmentsByPhase[currentPhase.id] || assignmentsByPhase[String(currentPhase.id)] || [];
            setActivePhaseAssignments(Array.isArray(phaseAssignments) ? phaseAssignments : []);
            setHasActivePhase(true);
          } else {
            setActivePhaseAssignments([]);
            setHasActivePhase(false);
          }
        } catch (phaseErr) {
          console.warn('Non-critical: Failed to load active phase assignments:', phaseErr);
          setActivePhaseAssignments([]);
          setHasActivePhase(false);
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
    <div className={leagueContext ? 'px-1 sm:px-2 py-2' : 'container mx-auto px-4 py-8'}>
      <div className="flex justify-between items-start mb-6">
        <div>
          {/* Back Navigation - only show if not in league context */}
          {!leagueContext && (
            <button
              onClick={handleBackToLeague}
              className="flex items-center text-primary-600 dark:text-primary-400 mb-4 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
            >
              <ArrowLeft size={16} className="mr-1" />
              <span className="text-sm">{getBackButtonText()}</span>
            </button>
          )}
          
          <h1 className="flex items-center text-2xl font-bold mb-2">
            <span className="inline-block h-8 w-2 mr-2 rounded-md" style={{backgroundColor: squadData.color}}></span>
            <span className="text-base font-caption">{squadData.name}</span>
          </h1>
        </div>
        
        {/* Total Points and Rank Display as side-by-side cards */}
        <div className="flex space-x-3">
          {/* Points Card */}
          <div className="lg-glass-secondary lg-rounded-lg border border-white/40 dark:border-white/10 px-4 py-3 min-w-[100px] text-center">
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Total Points</div>
            <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {Number.isInteger(squadData.total_points) 
                ? squadData.total_points 
                : parseFloat(squadData.total_points).toFixed(1)}
            </div>
          </div>
          
          {/* Rank Card - special styling for 1st place */}
          {rankInfo.rank && (
            <div className={`rounded-lg shadow px-4 py-3 min-w-[100px] text-center ${
              rankInfo.rank === 1 
                ? 'lg-glass-warning border border-amber-200/60 dark:border-amber-700/40' 
                : 'lg-glass-secondary border border-white/40 dark:border-white/10'
            }`}>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Rank</div>
              <div className={`text-xl font-bold ${
                rankInfo.rank === 1
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-primary-600 dark:text-primary-400'
              }`}>
                {rankInfo.rank}/{rankInfo.totalSquads}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs (owner only) */}
      {showBoostTab && (
        <div className="mb-6">
          <nav className="flex space-x-4 border-b border-neutral-200/70 dark:border-neutral-700/70">
            <button
              onClick={() => setActiveTab('players')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'players'
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
              }`}
            >
              Player List
            </button>
            <button
              onClick={() => setActiveTab('core')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'core'
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
              }`}
            >
              Boosts
            </button>
          </nav>
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-6">
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
