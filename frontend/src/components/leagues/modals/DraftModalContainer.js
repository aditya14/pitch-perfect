// src/components/leagues/modals/DraftModalContainer.js
import React, { useState, useEffect } from 'react';
import { useDraftModal } from '../../../context/DraftModalContext';
import MidSeasonDraftOrderModal from './MidSeasonDraftOrderModal';
import api from '../../../utils/axios';

const DraftModalContainer = () => {
  const { isModalOpen, modalProps, closeDraftModal } = useDraftModal();
  const [draftablePlayers, setDraftablePlayers] = useState([]);
  const [draftOrder, setDraftOrder] = useState(null);
  const [retainedPlayers, setRetainedPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { leagueId, squadId } = modalProps;

  // Fetch draft data when modal is opened
  useEffect(() => {
    if (isModalOpen && leagueId) {
      fetchDraftOrder();
    }
  }, [isModalOpen, leagueId]);

  const fetchDraftOrder = async () => {
    if (!leagueId) return;
    
    try {
      setIsLoading(true);
      setSaveError(null);
      
      // Fetch the mid-season draft pool
      const poolResponse = await api.get(`/leagues/${leagueId}/mid-season-draft/pool/`);
      setDraftablePlayers(poolResponse.data);
      
      // Fetch the user's draft order
      const orderResponse = await api.get(`/leagues/${leagueId}/mid-season-draft/order/`);
      setDraftOrder(orderResponse.data);
      
      // Get the squad's current core squad (retained players)
      if (squadId) {
        const squadResponse = await api.get(`/squads/${squadId}/`);
        const coreSquadData = squadResponse.data.current_core_squad || [];
        
        // Get player details for each core squad player
        const retainedPlayerIds = coreSquadData.map(item => item.player_id);
        const retainedPlayersData = poolResponse.data.filter(p => retainedPlayerIds.includes(p.id));
        setRetainedPlayers(retainedPlayersData);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching draft data:', error);
      setSaveError('Failed to load draft data');
      setIsLoading(false);
    }
  };

  const saveDraftOrder = async (newOrder) => {
    try {
      setSaveError(null);
      
      await api.post(`/leagues/${leagueId}/mid-season-draft/order/`, { 
        order: newOrder 
      });
      
      // Update local state
      setDraftOrder({
        ...draftOrder,
        order: newOrder
      });
      
      return true;
    } catch (error) {
      console.error('Error saving draft order:', error);
      setSaveError(error.response?.data?.error || 'Failed to save draft order');
      return false;
    }
  };

  return isModalOpen ? (
    <MidSeasonDraftOrderModal
      isOpen={isModalOpen}
      onClose={closeDraftModal}
      leagueId={leagueId}
      players={draftablePlayers}
      fetchDraftOrder={fetchDraftOrder}
      saveDraftOrder={saveDraftOrder}
      draftOrder={draftOrder}
      isLoading={isLoading}
      saveError={saveError}
      retainedPlayers={retainedPlayers}
    />
  ) : null;
};

export default DraftModalContainer;