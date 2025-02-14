import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';
import PlayerListTab from './PlayerListTab';
import CoreSquadTab from './CoreSquadTab';

const SquadView = () => {
  const { squadId } = useParams();
  const [activeTab, setActiveTab] = useState('players');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [squadData, setSquadData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [boostRoles, setBoostRoles] = useState([]);
  const [playerEvents, setPlayerEvents] = useState({});

  useEffect(() => {
    const fetchSquadData = async () => {
      try {
        setLoading(true);
        
        const squadResponse = await api.get(`/squads/${squadId}/`);
        console.log(squadResponse.data);
        setSquadData(squadResponse.data);

        const playersResponse = await api.get(`/squads/${squadId}/players/`);
        console.log(playersResponse.data);
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
  }, [squadId]);

  const updateFutureCoreSquad = async (boost_id, player_id) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-300">Loading squad data...</div>
      </div>
    );
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold dark:text-white mb-2">{squadData.name}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {squadData.league_name}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('players')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'players'
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Player List
          </button>
          <button
            onClick={() => setActiveTab('core')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'core'
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Core Squad
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
          />
        ) : (
          <CoreSquadTab
            players={players}
            boostRoles={boostRoles}
            currentCoreSquad={squadData.current_core_squad}
            futureCoreSquad={squadData.future_core_squad}
            onUpdateRole={updateFutureCoreSquad}
          />
        )}
      </div>
    </div>
  );
};

export default SquadView;