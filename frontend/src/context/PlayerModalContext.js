import React, { createContext, useContext, useState } from 'react';
import PlayerModal from '../components/players/PlayerModal';

const PlayerModalContext = createContext();

export const PlayerModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [leagueId, setLeagueId] = useState(null);

  const openPlayerModal = (playerId, leagueId) => {
    setPlayerId(playerId);
    setLeagueId(leagueId);
    setIsOpen(true);
  };

  const closePlayerModal = () => {
    setIsOpen(false);
    setPlayerId(null);
    setLeagueId(null);
  };

  return (
    <PlayerModalContext.Provider value={{ openPlayerModal, closePlayerModal }}>
      {children}
      <PlayerModal 
        playerId={playerId} 
        leagueId={leagueId} 
        isOpen={isOpen} 
        onClose={closePlayerModal} 
      />
    </PlayerModalContext.Provider>
  );
};

export const usePlayerModal = () => {
  const context = useContext(PlayerModalContext);
  if (!context) {
    throw new Error('usePlayerModal must be used within a PlayerModalProvider');
  }
  return context;
};