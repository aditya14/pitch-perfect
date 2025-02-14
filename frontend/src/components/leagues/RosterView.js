// RosterView.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import _ from 'lodash';
import api from '../../utils/axios';
import RosterList from './RosterList';
import DraftList from './DraftList';

const RosterView = () => {
  const { leagueId } = useParams();
  const [league, setLeague] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draftMode, setDraftMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState(null);
  const [draftClosesIn, setDraftClosesIn] = useState(null);
  const [canEditDraft, setCanEditDraft] = useState(false);

  // Fetch draft order
  const fetchDraftOrder = useCallback(async () => {
    try {
      const response = await api.get(`/drafts/get_draft_order/?league_id=${leagueId}`);
      setDraftOrder(response.data);
      setDraftClosesIn(response.data.closes_in);
      setCanEditDraft(response.data.can_edit);
    } catch (err) {
      console.error('Error fetching draft order:', err);
      setError(err.response?.data?.detail || 'Failed to fetch draft order');
    }
  }, [leagueId]);

  // Save draft order
  const saveDraftOrder = async (newOrder) => {
    if (!draftOrder?.id) return;
    
    try {
      await api.patch(`/drafts/${draftOrder.id}/update_order/`, {
        order: newOrder
      });
      setDraftOrder(prev => ({...prev, order: newOrder}));
    } catch (err) {
      throw new Error(err.response?.data?.detail || 'Failed to save draft order');
    }
  };

  // Fetch league and player data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const leagueResponse = await api.get(`/leagues/${leagueId}/`);
        setLeague(leagueResponse.data);
        
        const playersResponse = await api.get(
          `/leagues/${leagueId}/players?season=${leagueResponse.data.season.id}`
        );
        setPlayers(playersResponse.data);
        await fetchDraftOrder();
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.detail || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [leagueId, fetchDraftOrder]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded relative">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Player Roster
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {league?.name} - {league?.season?.name}
          </p>
        </div>
        
        {/* Draft Mode Toggle */}
        <div className="text-right">
          {canEditDraft && (
            <button
              onClick={() => setDraftMode(!draftMode)}
              className={`px-4 py-2 rounded-md font-medium mb-2 ${
                draftMode 
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {draftMode ? "View Roster" : "Update Draft Order"}
            </button>
          )}
          {draftClosesIn !== null && (
            <div className="flex items-center justify-end text-sm text-gray-600">
              <svg 
                className="w-4 h-4 mr-1"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              {formatTimeRemaining(draftClosesIn)}
            </div>
          )}
        </div>
      </div>

      {draftMode ? (
        <DraftList 
          players={players}
          draftOrder={draftOrder}
          onSaveOrder={saveDraftOrder}
        />
      ) : (
        <RosterList 
          players={players}
          leagueId={leagueId}
        />
      )}
    </div>
  );
};

// Utility function for formatting time
const formatTimeRemaining = (seconds) => {
  if (!seconds) return 'Draft closed';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h until draft closes`;
  if (hours > 0) return `${hours}h ${minutes}m until draft closes`;
  if (minutes > 0) return `${minutes}m until draft closes`;
  return 'Draft closing soon';
};

export default RosterView;