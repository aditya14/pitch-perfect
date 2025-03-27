import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/axios';
import PlayerListTab from './PlayerListTab';
import BoostTab from './BoostTab';
import { useAuth } from '../../context/AuthContext';
import { getTextColorForBackground } from '../../utils/colorUtils';
import { ArrowLeft } from 'lucide-react';
import LoadingScreen from '../elements/LoadingScreen';

const SquadView = () => {
  const { squadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('players');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [squadData, setSquadData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [boostRoles, setBoostRoles] = useState([]);
  const [playerEvents, setPlayerEvents] = useState({});
  const [isOwnSquad, setIsOwnSquad] = useState(false);

  const [rankInfo, setRankInfo] = useState({ rank: null, totalSquads: null });

  useEffect(() => {
    const fetchSquadData = async () => {
      try {
        setLoading(true);
        
        const squadResponse = await api.get(`/squads/${squadId}/`);
        console.log('Squad Response:', squadResponse.data);
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
  
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching squad data:', err);
        setError('Failed to load squad data. Please try again later.');
        setLoading(false);
      }
    };
  
    fetchSquadData();
  }, [squadId, user]);

  const updateFutureCoreSquad = async (boost_id, player_id) => {
    if (!isOwnSquad) return; // Prevent updates for other users' squads
    
    try {
      await api.patch(`/squads/${squadId}/core-squad/`, {
        boost_id,
        player_id
      });
      
      // Refresh squad data to get updated core squad assignments
      const response = await api.get(`/squads/${squadId}/`);
      setSquadData(response.data);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to update core squad roles');
    }
  };

  const handleBackToLeague = () => {
    if (squadData?.league_id) {
      navigate(`/leagues/${squadData.league_id}`);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Squad" description='One moment please' />;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-100 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          {/* Back Navigation */}
          <button
            onClick={handleBackToLeague}
            className="flex items-center text-primary-600 dark:text-primary-400 mb-4 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span className="text-sm">{squadData.league_name}</span>
          </button>
          <h1 className="flex items-center text-2xl font-bold mb-2">
            <span className="inline-block h-8 w-2 mr-2 rounded-md" style={{backgroundColor: squadData.color}}></span>
            <span>{squadData.name}</span>
          </h1>
        </div>
        
        {/* Total Points and Rank Display as side-by-side cards */}
        <div className="flex space-x-3">
          {/* Points Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3 min-w-[100px] text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Points</div>
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
                ? 'bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-800' 
                : 'bg-white dark:bg-gray-800'
            }`}>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Rank</div>
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

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('players')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'players'
                ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Player List
          </button>
          <button
            onClick={() => setActiveTab('core')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'core'
                ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Boosts
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'players' ? (
          <PlayerListTab
            players={players}
            playerEvents={playerEvents}
            currentCoreSquad={squadData.current_core_squad}
            boostRoles={boostRoles}
            leagueId={squadData.league_id}
            squadColor={squadData.color}
          />
        ) : (
          <BoostTab
            players={players}
            boostRoles={boostRoles}
            currentCoreSquad={squadData.current_core_squad}
            futureCoreSquad={squadData.future_core_squad}
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